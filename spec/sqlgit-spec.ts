import {failFunc} from "./common";
import {getMostRecentCommit, getSqlFiles} from "../src/sqlgit";

describe('sqlgit file reader', () => {
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

  it('fails to fetch non-existant files', (done) => {
    let lastError: string;
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/bad_files/not_a_real_file.sql');
    }).catch(err => {
      lastError = err.message;
    }).then(() => {
      expect(lastError.indexOf("test/bad_files/not_a_real_file.sql does not exist in commit ")).toBe(0);
      lastError = '';
      return getMostRecentCommit();
    }).then((commit) => {
      return getSqlFiles(commit, 'test/bad_files/includes_bad_files.sql');
    }).catch(err => {
      lastError = err.message;
    }).then(() => {
      expect(lastError.indexOf("test/db/not_a_real_file.sql does not exist in commit ")).toBe(0);
      lastError = '';
    }).catch(failFunc).then(() => {
      done();
    });
  });

  it('handles empty files', (done) => {
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/bad_files/empty.sql');
    }).then((entries) => {
      expect(entries.length).toBe(1);
      const entry = entries[0];
      expect(entry.isFile()).toBe(true);
      expect(entry.name()).toBe('empty.sql');
    }).catch(failFunc).then(() => {
      done();
    });
  });

  it('complains about mixed include and non-include files', (done) => {
    let lastError: string;
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/bad_files/mixed_includes.sql');
    }).catch(err => {
      lastError = String(err);
    }).then(() => {
      expect(lastError).toBe("Error: test/bad_files/mixed_includes.sql has mixed including files and regular sql");
      lastError = '';
      return getMostRecentCommit();
    }).then((commit) => {
      return getSqlFiles(commit, 'test/bad_files/mixed_includes_2.sql');
    }).catch(err => {
      lastError = String(err);
    }).then(() => {
      expect(lastError).toBe("Error: test/bad_files/mixed_includes_2.sql has mixed including files and regular sql");
      lastError = '';
    }).catch(failFunc).then(() => {
      done();
    });
  });

  it('returns the list of files in order', (done) => {
    getMostRecentCommit().then((commit) => {
      return getSqlFiles(commit, 'test/nesting/start.sql');
    }).then((entries) => {
      expect(entries.length).toBeGreaterThan(1);
      entries.forEach((entry, ix) => {
        expect(entry.isFile()).toBe(true);
        expect(entry.name()).toBe(String(ix + 1));
      });
    }).catch(failFunc).then(() => {
      done();
    });
  });
});
