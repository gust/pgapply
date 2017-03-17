/// <reference path='../typings/index' />
require('dotenv').config({path: '.deployenv'});

import * as pgPromise from 'pg-promise';
import {DockerDatabase} from './docker_control';
import {getMostRecentCommit, installFile} from './sqlgit';

const pgp = pgPromise({});

const DB_FILE_LOCATION: string = process.env.DBFILE ? process.env.DBFILE : 'test/db/';
const SUPERUSER_SETUP_SCRIPT: string = process.env.SETUPSCRIPT;
const USER_DB: string = process.env.DBDATABASE || 'postgres';
const USER_NAME: string = process.env.DBUSER || 'postgres';
const USER_PASS: string = process.env.DBPASS || 'password';

function main(): Promise<void> {
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
      console.log('building DB');
      const dockerDB = new DockerDatabase();
      let commit: GITCommit;
      return dockerDB.init()
      .then(() => {
        return getMostRecentCommit();
      }).then((_c) => {
        commit = _c;
        return dockerDB.getDBConnection();
      }).then((db) => {
        if (USER_DB !== 'postgres') {
          return db.query('CREATE DATABASE ' + USER_DB);
        }
      }).then(() => {
        return dockerDB.getDBConnection(USER_DB);
      }).then((db) => {
        console.log('running setup script:', SUPERUSER_SETUP_SCRIPT);
        return installFile(db, commit, SUPERUSER_SETUP_SCRIPT, false);
      }).then(() => {
        return dockerDB.getDBConnection(
          USER_DB,
          USER_NAME,
          USER_PASS
        );
      }).then((db) => {
        console.log('building from:', DB_FILE_LOCATION);
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
      return Promise.resolve(undefined);
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
