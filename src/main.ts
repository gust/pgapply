/// <reference path='../typings/index' />

import * as pgPromise from 'pg-promise';
import {DockerDatabase} from './docker_control';
const Git = require('nodegit');

const pgp = pgPromise({});

const monitoring_triggers = require('../sql/monitoring_triggers.sql');

const DB_FILE_LOCATION = 'test/db/';

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
            let db: pgPromise.IDatabase<any>;
            const dockerDB = new DockerDatabase();
            return dockerDB.init()
            .then(() => dockerDB.getDBConnection())
            .then((db_) => {
                db = db_;
                // get file(s?) from GIT
                return Git.Repository.open('.');
            }).then((_repo) => {
                repo = _repo;
                return repo.getCurrentBranch();
            }).then((branch) => {
                return repo.getBranchCommit(branch);
            }).then((commit) => {
                console.log(commit.message());
                return commit.getEntry(DB_FILE_LOCATION);
            }).then((entry) => {
                // get the entries from provided location
                if (entry.isTree()) {
                    return entry.getTree().then((tree: any) => {
                        return Promise.all(tree.entries()
                        .filter((entry: any) => entry.isBlob())
                        .map((entry: any) => {
                            return entry;
                        }));
                    });
                } else {
                    return Promise.all([entry]);
                }
            }).then((entries: Array<any>) => {
                // Install triggers
                return db.query(monitoring_triggers).then(() => entries);
            }).then((entries: Array<any>) => {
                // - need to pick a supported language that can set session variables
                // - postgres docker images don't come with extension files though
                // - can try SET / SHOW of client name as filename
                // for each blob
                // - start a transaction
                // - set the filename
                // - run the blob
                // - close transaction
                // pull list of affects from the DB
                return entries.reduce((prior, entry) => {
                    return prior.then(() => db.task((con) => {
                        return con.query('SET application_name TO $1', entry.name())
                        .then(() => entry.getBlob())
                        .then((blob: any) => {
                            return con.query(blob.toString());
                        });
                    }));
                }, Promise.resolve());
            }).then(() => {
                return db.query("select * from deploy.monitoring where type != 'not sure'");
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
