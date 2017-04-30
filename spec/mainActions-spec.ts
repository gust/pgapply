import {failFunc} from "./common";
import {actions} from "../src/actions";
import {getDBConnection} from "../src/sqlUtil";
import {DockerDatabase} from '../src/docker_control';

describe("users", () => {
  it("can install into a database", (done) => {
    const db = new DockerDatabase();
    const schema_name = 'deploy';
    db.init().then(() => {
      return actions.install(db.getConnectionDetails());
    }).then(() => {
      return getDBConnection(db.getConnectionDetails());
    }).then((conn) => {
      return <Promise<{schema_name: string}>>conn.one("SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1;", schema_name);
    }).then((res) => {
      expect(res.schema_name).toBe(schema_name);
    }).catch(failFunc).then(() => {
      // CircleCI doesn't allow removing containers
      const rmContainer = !process.env.CIRCLECI;

      db.destroy(rmContainer);
      done();
    });
  }, 30000);

  it("can determine the structure of a database from source", (done) => {
    actions.buildDb('test/db/functions.sql').then((res) => {
      expect(res.length).toBe(2);
      expect(res.every((entry: any) => {
        return entry.file === 'functions.sql' &&
          entry.type === 'function' &&
          entry.op === 'CREATE FUNCTION';
      })).toBe(true);
      expect(res.some((entry: any) => {
        return entry.name === 'hello_world';
      })).toBe(true);
      expect(res.some((entry: any) => {
        return entry.name === 'the_answer';
      })).toBe(true);
    }).catch(failFunc).then(() => {
      done();
    });
  }, 30000);
});
