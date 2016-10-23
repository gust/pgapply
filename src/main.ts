/// <reference path='../typings/index' />

import * as pgPromise from 'pg-promise';
import {execFile} from 'child_process';

const pgp = pgPromise({});

const default_db = {
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'password',
    application_name: 'deploy'
}

const db = pgp(default_db);

const db_file_location = 'test/db'
const PG_VERSION = '9.2' // oldest version still in support

function main():Promise<any> {
    let command = process.argv[2];
    switch (command) {
        case 'install':
            console.log('installing');
            return db.query('CREATE SCHEMA deploy;').then(function() {
                console.log('complete');
            }).catch(function(err: Error) {
                console.log(err);
            });
        case 'build-db':
            console.log('building current DB from ', db_file_location);
            let instance_id:string;
            return new Promise(function(resolve, reject) {
                // start docker image of PG_VERSION
                // docker run -d -P -e POSTGRES_PASSWORD=password postgres:9.2
                const child = execFile('docker',
                    ['run', '-d', '-P', '-e', 'POSTGRES_PASSWORD=password', 'postgres:9.2'],
                    {},
                    function(err: Error, stdout:string, stderr:string) {
                        if (err) {
                            console.error(stderr);
                            reject(err);
                        } else {
                            resolve(stdout.trim());
                        }
                    });
            }).then(function(iid:string) {
                instance_id = iid;
                // retrieve docker host:port
                return new Promise(function(resolve, reject) {
                    const child = execFile('docker',
                        ['port', instance_id, '5432/tcp'],
                        {},
                        function(err: Error, stdout:string, stderr:string) {
                            if (err) {
                                console.error(stderr);
                                reject(err);
                            } else {
                                resolve(stdout.trim());
                            }
                        });
                });
            }).then(function(host_port:string) {
                // poll socket for readability
                let [host, port] = host_port.split(':');
                if (host == '0.0.0.0') {
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
                let attempt_connect = function(depth = 0):Promise<void> {
                    return db.query('select 1;')
                    .catch(function(err:Error) {
                        // TODO: only retry if err is ECONNRESET
                        // TODO: add a delay before trying again
                        if (depth < 20000) {
                            return attempt_connect(depth + 1);
                        } else {
                            throw err;
                        }
                    });
                }
                return attempt_connect();
            }).then(function() {
                // get file(s?) from GIT
                // dump into pg
            }).then(function() {
                // shut down docker image
                return new Promise(function(resolve, reject) {
                    const child = execFile('docker',
                        ['stop', instance_id],
                        {},
                        function(err: Error, stdout:string, stderr:string) {
                            if (err) {
                                console.error(stderr);
                                reject(err);
                            } else {
                                resolve(stdout.trim());
                            }
                        });
                });
            }).then(function() {
                // remove the instance
                return new Promise(function(resolve, reject) {
                    const child = execFile('docker',
                        ['rm', instance_id],
                        {},
                        function(err: Error, stdout:string, stderr:string) {
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

main().catch(function(err: Error) {
    console.error(err);
}).then(function() {
    shutdown();
})
