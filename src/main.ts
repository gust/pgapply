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
    switch (process.argv[2]) {
        case 'install':
            console.log('installing');
            return db.query('CREATE SCHEMA deploy;').then(function() {
                console.log('complete');
            }).catch(function(err: Error) {
                console.log(err);
            });
        case 'build-db':
            console.log('building current DB from ', db_file_location);
            return new Promise(function(resolve, reject) {
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
                    console.log('got iid: "', iid, '"');
                    instance_id = iid;
                    // poll socket for readability
                    return new Promise(function(resolve, reject) {
                        // start docker image of PG_VERSION
                        // docker run -d -P -e POSTGRES_PASSWORD=password postgres:9.2
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
                    console.log('host_port', host_port)
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
                    let attempt_connect = function():Promise<void> {
                        return db.query('select 1;')
                        .catch(function(err:Error) {
                            return attempt_connect();
                        });
                    }
                    return attempt_connect();
                });
                // get file(s?) from GIT
                // dump into pg
                // shut down docker image
            });
        default:
            console.log('did not recognize:', process.argv[0]);
            console.log('valid actions are:\n' +
            'install: install into a running postgres instance');
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
