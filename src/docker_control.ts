import {execFile} from 'child_process';
import * as pgPromise from 'pg-promise';

const pgp = pgPromise({});

const PG_VERSION = '9.3'; // oldest version that supports event_triggers

export class DockerDatabase {
  private instanceId: string;
  private host: string;
  private port: number;

  constructor() {
  }

  init(): Promise<string> {
    return new Promise((resolve, reject) => {
      // start docker image of PG_VERSION
      // docker run -d -P -e POSTGRES_PASSWORD=password postgres:9.2
      execFile('docker',
        ['run', '-d', '-P', '-e', 'POSTGRES_PASSWORD=password', 'postgres:' + PG_VERSION],
        {},
        (err: Error, stdout: string, stderr: string) => {
          if (err) {
            console.error(stderr);
            reject(err);
          } else {
            resolve(stdout.trim());
          }
        });
    }).then((iid: string) => {
      this.instanceId = iid;
      // retrieve docker host:port
      return new Promise((resolve, reject) => {
        execFile('docker',
          ['port', this.instanceId, '5432/tcp'],
          {},
          (err: Error, stdout: string, stderr: string) => {
            if (err) {
              console.error(stderr);
              reject(err);
            } else {
              let [host, port] = stdout.trim().split(':');
              if (host === '0.0.0.0') {
                host = 'localhost';
              }
              this.host = host;
              this.port = parseFloat(port);
              resolve();
            }
          });
      });
    });
  }

  getDBConnection(database = 'postgres', user = 'postgres', password = 'password') {
    // poll socket for readability
    const db = pgp({
      host: this.host,
      port: this.port,
      database: database,
      user: user,
      password: password,
      application_name: 'deploy'
    });
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

  destroy(): Promise<void> {
    // shut down docker image
    return new Promise<void>((resolve, reject) => {
      execFile('docker',
        ['stop', this.instanceId],
        {},
        (err: Error, stdout: string, stderr: string) => {
          if (err) {
            console.error(stderr);
            reject(err);
          } else {
            resolve();
          }
        });
    }).then(() => {
      // remove the instance
      return new Promise<void>((resolve, reject) => {
        execFile('docker',
          ['rm', this.instanceId],
          {},
          (err: Error, stdout: string, stderr: string) => {
            if (err) {
              console.error(stderr);
              reject(err);
            } else {
              resolve();
            }
          });
      });
    });
  }
}
