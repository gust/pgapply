'use strict';

const docker = require('../src/docker_control.ts');
const DockerDatabase = docker.DockerDatabase;

describe("DockerDatabase", () => {
  const runningDB = new DockerDatabase();
  let originalTimeout;

  it('can be inited', (done) => {
    expect(runningDB instanceof DockerDatabase).toBe(true);
    expect(runningDB.instanceId).toBeUndefined();
    expect(runningDB.host).toBeUndefined();
    expect(runningDB.port).toBeUndefined();
    runningDB.init().then(() => {
      expect(runningDB.instanceId).toBeTruthy();
      expect(runningDB.host).toBeTruthy();
      expect(runningDB.port).toBeTruthy();
      done();
    });
  }, 30000);

  it('can be connected to', (done) => {
    runningDB.getDBConnection().then((db) => {
      return db.one('select 1 as one');
    }).then((res) => {
      expect(res.one).toBe(1);
      done();
    });
  }, 30000);

  it('can be stopped', (done) => {
    runningDB.destroy().then(() => {
      done();
    });
  }, 30000);
});
