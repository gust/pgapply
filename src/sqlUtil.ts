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

  toString() {
    return `postgres://${this.user}:${this.password}@${this.host}:${this.port}/${this.database}`;
  }

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

const connCache: {
  [connString: string]: pgPromise.IDatabase<any>
} = {};

export function getDBConnection(conn: ConnectionDetails): Promise<pgPromise.IDatabase<any>> {
  const cacheString = conn.toString();
  if (connCache[cacheString]) {
    return Promise.resolve(connCache[cacheString]);
  }
  // poll socket for readability
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
  return attempt_connect().then(() => {
    connCache[cacheString] = db;
    return db;
  });
}

export function teardown() {
  pgp.end();
}
