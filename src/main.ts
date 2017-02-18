/// <reference path='../typings/index' />
require('dotenv').config({path: '.deployenv'});

import * as pgPromise from 'pg-promise';
import {DockerDatabase} from './docker_control';
const Git = require('nodegit');

const pgp = pgPromise({});

const monitoring_triggers = require('../sql/monitoring_triggers.sql');

const DB_FILE_LOCATION: string = process.env.DBFILE ? process.env.DBFILE : 'test/db/';
const SUPERUSER_SETUP_SCRIPT: string = process.env.SETUPSCRIPT;
const USER_DB: string = process.env.DBDATABASE;
const USER_NAME: string = process.env.DBUSER;
const USER_PASS: string = process.env.DBPASS;

type GITBlob = {
    toString: () => string
}

type GITTree = {
    entries: () => Array<GITTreeEntry>
}

type GITTreeEntry = {
    getBlob: () => Promise<GITBlob>
    getTree: () => Promise<GITTree>
    isTree: () => boolean
    name: () => string
    path: () => string
}

function getSqlFiles(commit: any, path: string): Promise<Array<GITTreeEntry>> {
    return commit.getEntry(path).then((entry: GITTreeEntry) => {
        // get the entries from provided location
        let subEntries: Promise<Array<Array<GITTreeEntry>>>;
        if (entry.isTree()) {
            subEntries = entry.getTree()
            .then((tree) => {
                return Promise.all(tree.entries().map((entry) => getSqlFiles(commit, entry.path())));
            });
        } else {
            subEntries = entry.getBlob().then((blob) => {
                const lines = blob.toString().split('\n').filter(line => {
                    return line.length > 0 && line.substr(0, 2) !== '--';
                });
                if (lines[0].substr(0, 2) === '\\i') {
                    return Promise.all(
                        lines.map((line) => line.split(' ')[1])
                            .map((filepath) => getSqlFiles(commit, filepath))
                    );
                } else {
                    return Promise.all([[entry]]);
                }
            });
        }
        return subEntries.then((nestedEntryList: Array<Array<GITTreeEntry>>) => {
            return [].concat.apply(
                [],
                nestedEntryList
            );
        });
    });
}

function installFile(db: pgPromise.IDatabase<any>, commit: any, path: string, monitorInstall: boolean = true) {
    return getSqlFiles(commit, path).then((entries: Array<GITTreeEntry>) => {
        // Install triggers
        if (monitorInstall) {
            return db.query(monitoring_triggers).then(() => entries);
        } else {
            return entries;
        }
    }).then((entries) => {
        return entries.reduce((prior, entry) => {
            return prior.then(() => db.task((con) => {
                console.log('loading file:', entry.path());
                return con.query('SET application_name TO $1', entry.name())
                .then(() => entry.getBlob())
                .then((blob: GITBlob) => {
                    return con.query(blob.toString());
                });
            }));
        }, Promise.resolve());
    }).then(() => {
        if (monitorInstall) {
            return db.query("select * from deploy.monitoring where type != 'not sure'");
        }
    });
}

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
