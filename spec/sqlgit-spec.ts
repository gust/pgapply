'use strict';

import {getMostRecentCommit, getSqlFiles} from "../src/sqlgit";

const failFunc = (err: any) => {
  console.log(err);
  expect('this test').toBe('working');
};

describe('sqlgit', () => {
  it('can read single files', (done) => {
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/db/functions.sql');
    }).then((entries) => {
      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.isFile()).toBe(true);
      expect(entry.name()).toBe('functions.sql');
    }).catch(failFunc).then(() => {
      done();
    });
  });

  it('can understand sql include files', (done) => {
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/db/includes_others.sql');
    }).then((entries) => {
      expect(entries.length).toBe(2);
      entries.forEach((entry) => {
        expect(entry.isFile()).toBe(true);
      });
      // entries should be in the original order
      expect(entries[0].name()).toBe('functions.sql');
      expect(entries[1].name()).toBe('views.sql');
    }).catch(failFunc).then(() => {
      done();
    });
  });
});

// TODO: tests
// - reading a file, determining whether it's and include file or not
// - throwing a sane error when a file doesn't exist
// - throwing a sane error (file / line no) when a file is mixed include & not
// - generate list of files in order
// - ensure errors are failures
