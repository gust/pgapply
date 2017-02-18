'use strict';

const docker = require('../output/docker_control.js');
const DockerDatabase = docker.DockerDatabase;

describe("DockerDatabase", () => {
  const runningDB = new DockerDatabase();
  let originalTimeout;

  beforeEach(function() {
    originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
    jasmine.DEFAULT_TIMEOUT_INTERVAL = 30000;
  });

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
  });

  it('can be connected to', (done) => {
    runningDB.getDBConnection().then((db) => {
      return db.one('select 1 as one');
    }).then((res) => {
      expect(res.one).toBe(1);
      done();
    });
  });

  it('can be stopped', (done) => {
    runningDB.destroy().then(() => {
      done();
    })
  });

  afterEach(() => {
    jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
  });
});
