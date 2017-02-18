/// <reference path='../typings/index' />
require('dotenv').config({path: '.deployenv'});

import * as pgPromise from 'pg-promise';
import {DockerDatabase} from './docker_control';
import {installFile} from './sqlgit';
const Git = require('nodegit');

const pgp = pgPromise({});

const DB_FILE_LOCATION: string = process.env.DBFILE ? process.env.DBFILE : 'test/db/';
const SUPERUSER_SETUP_SCRIPT: string = process.env.SETUPSCRIPT;
const USER_DB: string = process.env.DBDATABASE;
const USER_NAME: string = process.env.DBUSER;
const USER_PASS: string = process.env.DBPASS;

function main(): Promise<any> {
    let command = process.argv[2];
    switch (command) {
        case 'install':
            console.log('installing');
            const default_db = pgp({
                host: 'localhost',
                port: 5432,
                database: 'postgres',
                user: 'postgres',
                password: 'password',
                application_name: 'deploy'
            });
            return default_db.query('CREATE SCHEMA deploy;').then(() => {
                console.log('complete');
            }).catch((err: Error) => {
                console.log(err);
            });
        case 'build-db':
            console.log('building current DB from', DB_FILE_LOCATION);
            let repo: any; // Git.Repository object
            const dockerDB = new DockerDatabase();
            let commit: any;
            return dockerDB.init()
            .then(() => {
                // get file(s?) from GIT
                return Git.Repository.open('.');
            }).then((_repo) => {
                repo = _repo;
                return repo.getCurrentBranch();
            }).then((branch) => {
                return repo.getBranchCommit(branch);
            }).then((_c) => {
                commit = _c;
                return dockerDB.getDBConnection();
            }).then((db) => {
                return installFile(db, commit, SUPERUSER_SETUP_SCRIPT, false);
            }).then(() => {
                return dockerDB.getDBConnection({
                    database: USER_DB,
                    user: USER_NAME,
                    password: USER_PASS
                });
            }).then((db) => {
                return installFile(db, commit, DB_FILE_LOCATION, true);
            }).then((res) => {
                console.log(res);
            }).catch((err) => {
                console.log(err);
            }).then(() => dockerDB.destroy());
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
