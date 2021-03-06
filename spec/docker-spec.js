'use strict';
const failFunc = require('./common.ts').failFunc;
const docker = require('../src/docker_control.ts');
const DockerDatabase = docker.DockerDatabase;
const getDBConnection = require('../src/sqlUtil.ts').getDBConnection;

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
    }).catch(failFunc).then(() => {
      done();
    });
  }, 30000);

  it('can be connected to', (done) => {
    getDBConnection(runningDB.getConnectionDetails()).then((db) => {
      return db.one('select 1 as one');
    }).then((res) => {
      expect(res.one).toBe(1);
    }).catch(failFunc).then(() => {
      done();
    });
  }, 30000);

  it('can be stopped', (done) => {
    // CircleCI doesn't allow removing containers
    const rmContainer = !process.env.CIRCLECI;
    runningDB.destroy(rmContainer).catch(failFunc).then(() => {
      done();
    });
  }, 30000);
});
