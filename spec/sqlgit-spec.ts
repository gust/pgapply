'use strict';

import {getMostRecentCommit, getSqlFiles} from "../src/sqlgit";

describe('sqlgit', () => {
  it('can read single files', (done) => {
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/db/functions.sql');
    }).then((entries) => {
      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.isFile()).toBe(true);
      expect(entry.name()).toBe('functions.sql');
    }).then(() => {
      done();
    }).catch(err => {
      console.log(err);
      expect('this test').toBe('working');
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
