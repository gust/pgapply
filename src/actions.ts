import {DockerDatabase} from './docker_control';
import {getMostRecentCommit, installFile} from './sqlgit';
import {ConnectionDetails, getDBConnection} from './sqlUtil';

export const actions = {
  install: (connection: ConnectionDetails) => {
    return getDBConnection(connection).then((conn) => {
      return conn.query('CREATE SCHEMA deploy;');
    });
  },
  buildDb: (fileLocation: string, userConnection: (ConnectionDetails|undefined) = undefined, image: string = 'postgres:9.3') => {
    const dockerDB = new DockerDatabase(image);
    let commit: GITCommit;
    return dockerDB.init()
    .then(() => {
      return getMostRecentCommit();
    }).then((_c) => {
      commit = _c;
      return getDBConnection(dockerDB.getConnectionDetails());
    }).then((db) => {
      if (userConnection && userConnection.user !== 'postgres') {
        return db.query("CREATE USER " + userConnection.user + " WITH ENCRYPTED PASSWORD '" + userConnection.password + "' SUPERUSER").then(() => {
          return db;
        });
      }
    }).then((db) => {
      if (userConnection && userConnection.database !== 'postgres') {
        return db.query('CREATE DATABASE ' + userConnection.database + " WITH OWNER = " + userConnection.user);
      }
    }).then(() => {
      const conn = dockerDB.getConnectionDetails();
      if (userConnection) {
        conn.database = userConnection.database;
        conn.user = userConnection.user;
        conn.password = userConnection.password;
      }
      return getDBConnection(conn);
    }).then((db) => {
      console.log('building from:', fileLocation);
      return installFile(db, commit, fileLocation, true);
    }).then((res) => {
      dockerDB.destroy();
      return res;
    });
  },
  help: () => {
    console.log('valid actions are:\n' +
    'install: install into a running postgres instance\n' +
    'build-db: test build the current db\n');
    return Promise.resolve(undefined);
  }
};
