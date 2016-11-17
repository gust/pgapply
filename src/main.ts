/// <reference path='../typings/index' />

import * as pgPromise from 'pg-promise';
import {execFile} from 'child_process';
const Git = require('nodegit');

const pgp = pgPromise({});

const default_db = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    application_name: 'deploy'
};

const db = pgp(default_db);

const DB_FILE_LOCATION = 'test/db';
const PG_VERSION = '9.2'; // oldest version still in support

function main(): Promise<any> {
    let command = process.argv[2];
    switch (command) {
        case 'install':
            console.log('installing');
            return db.query('CREATE SCHEMA deploy;').then(() => {
                console.log('complete');
            }).catch((err: Error) => {
                console.log(err);
            });
        case 'build-db':
            console.log('building current DB from ', DB_FILE_LOCATION);
            let instance_id: string;
            let repo: any; // Git.Repository object
            return new Promise((resolve, reject) => {
                // start docker image of PG_VERSION
                // docker run -d -P -e POSTGRES_PASSWORD=password postgres:9.2
                execFile('docker',
                    ['run', '-d', '-P', '-e', 'POSTGRES_PASSWORD=password', 'postgres:9.2'],
                    {},
                    (err: Error, stdout: string, stderr: string) => {
                        if (err) {
                            console.error(stderr);
                            reject(err);
                        } else {
                            resolve(stdout.trim());
                        }
                    });
            }).then((iid: string) => {
                instance_id = iid;
                // retrieve docker host:port
                return new Promise((resolve, reject) => {
                    execFile('docker',
                        ['port', instance_id, '5432/tcp'],
                        {},
                        (err: Error, stdout: string, stderr: string) => {
                            if (err) {
                                console.error(stderr);
                                reject(err);
                            } else {
                                resolve(stdout.trim());
                            }
                        });
                });
            }).then((host_port: string) => {
                // poll socket for readability
                let [host, port] = host_port.split(':');
                if (host === '0.0.0.0') {
                    host = 'localhost';
                }
                const db = pgp({
                    host,
                    port: parseFloat(port),
                    database: 'postgres',
                    user: 'postgres',
                    password: 'password',
                    application_name: 'deploy'
                });
                let attempt_connect = (depth = 0): Promise<void> => {
                    return db.query('select 1;')
                    .catch((err: Error) => {
                        // TODO: only retry if err is ECONNRESET
                        // TODO: add a delay before trying again
                        if (depth < 20000) {
                            return attempt_connect(depth + 1);
                        } else {
                            throw err;
                        }
                    });
                };
                return attempt_connect();
            }).then(() => {
                // get file(s?) from GIT
                return Git.Repository.open('.');
            }).then((_repo) => {
                repo = _repo;
                return repo.getCurrentBranch();
            }).then((branch) => {
                return repo.getBranchCommit(branch);
            }).then((commit) => {
                console.log(commit.message());
                return commit.getTree();
            }).then((tree) => {
                return tree.entries();
            }).then((entries) => {
                entries.forEach((ent: any) => { // type is Git.TreeEntry
                    console.log(ent.name());
                });
            }).then(() => {
                // dump into pg
            }).then(() => {
                // shut down docker image
                return new Promise((resolve, reject) => {
                    execFile('docker',
                        ['stop', instance_id],
                        {},
                        (err: Error, stdout: string, stderr: string) => {
                            if (err) {
                                console.error(stderr);
                                reject(err);
                            } else {
                                resolve(stdout.trim());
                            }
                        });
                });
            }).then(() => {
                // remove the instance
                return new Promise((resolve, reject) => {
                    execFile('docker',
                        ['rm', instance_id],
                        {},
                        (err: Error, stdout: string, stderr: string) => {
                            if (err) {
                                console.error(stderr);
                                reject(err);
                            } else {
                                resolve(stdout.trim());
                            }
                        });
                });
            });
        default:
            console.log('did not recognize:', command);
            console.log('valid actions are:\n' +
            'install: install into a running postgres instance\n' +
            'build-db: test build the current db\n');
            return Promise.resolve();
    }
}

function shutdown() {
    pgp.end();
}

main().catch((err: Error) => {
    console.error(err);
}).then(() => {
    shutdown();
});
