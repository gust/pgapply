import {execFile} from 'child_process';
import {ConnectionDetails} from './sqlUtil';

const postgres_password = 'password1';

export class DockerDatabase {
  private instanceId: string;
  private host: string;
  private port: number;

  constructor(private dockerImage = 'postgres:9.3') { // oldest version that supports event_triggers
  }

  init(): Promise<string> {
    return new Promise((resolve, reject) => {
      // start docker image of PG_VERSION
      // docker run -d -P -e POSTGRES_PASSWORD=password postgres:9.2
      execFile('docker',
        ['run', '-d', '-P', '-e', 'POSTGRES_PASSWORD=' + postgres_password, this.dockerImage],
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

  getConnectionDetails() {
    const conn = new ConnectionDetails();
    conn.host = this.host;
    conn.port = this.port;
    conn.password = postgres_password;
    return conn;
  }

  destroy(rmContainer = true): Promise<void> {
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
      if (rmContainer) {
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
      }
    });
  }
}
