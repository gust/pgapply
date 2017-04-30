require('dotenv').config({path: '.deployenv'});

import {actions} from './actions';
import {ConnectionDetails, teardown} from './sqlUtil';

const DB_FILE_LOCATION: string = process.env.DBFILE ? process.env.DBFILE : 'test/db/';
const USER_DB: string = process.env.DBDATABASE || 'postgres';
const USER_NAME: string = process.env.DBUSER || 'postgres';
const USER_PASS: string = 'password2';
const PGIMAGE: string = process.env.PGIMAGE || 'postgres:9.3';

function main(): Promise<void> {
  let command = process.argv[2];
  switch (command) {
    case 'install':
      console.log('installing');
      return actions.install(new ConnectionDetails()).then(() => {
        console.log('complete');
      }).catch((err: Error) => {
        console.log(err);
      });
    case 'build-db':
      console.log('building DB');
      const userConnection = new ConnectionDetails();
      userConnection.database = USER_DB;
      userConnection.user = USER_NAME;
      userConnection.password = USER_PASS;
      return actions.buildDb(DB_FILE_LOCATION, userConnection, PGIMAGE).then((res) => {
        console.log(res);
      }).catch((err) => {
        console.log(err);
      });
    default:
      console.log('did not recognize:', command);
      return actions.help();
  }
}

function shutdown() {
  teardown();
}

main().catch((err: Error) => {
  console.error(err);
}).then(() => {
  shutdown();
});
