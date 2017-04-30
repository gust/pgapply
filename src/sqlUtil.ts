import * as pgPromise from 'pg-promise';
const pgp = pgPromise({});

export class ConnectionDetails {
  host: string = 'localhost';
  port: number = 5432;
  database: string = 'postgres';
  user: string = 'postgres';
  password?: string;
  applicationName: string = 'pgapply';

  constructor() { }

  toObject() {
    return {
      host: this.host,
      port: this.port,
      database: this.database,
      user: this.user,
      password: this.password,
      application_name: this.applicationName
    };
  }
}

export function getDBConnection(conn: ConnectionDetails) {
  // poll socket for readability
  // TODO: cache the `db` results here so that we do not create duplicate connections
  const db = pgp(conn.toObject());
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
  return attempt_connect().then(() => db);
}

export function teardown() {
  pgp.end();
}
