import * as pgPromise from 'pg-promise';

const monitoring_triggers = require('../sql/monitoring_triggers.sql');

type GITBlob = {
  toString: () => string
};

type GITTree = {
  entries: () => Array<GITTreeEntry>
};

type GITTreeEntry = {
  getBlob: () => Promise<GITBlob>
  getTree: () => Promise<GITTree>
  isTree: () => boolean
  name: () => string
  path: () => string
};

function getSqlFiles(commit: any, path: string): Promise<Array<GITTreeEntry>> {
  return commit.getEntry(path).then((entry: GITTreeEntry) => {
    // get the entries from provided location
    let subEntries: Promise<Array<Array<GITTreeEntry>>>;
    if (entry.isTree()) {
      subEntries = entry.getTree()
      .then((tree) => {
        return Promise.all(tree.entries().map((entry) => getSqlFiles(commit, entry.path())));
      });
    } else {
      subEntries = entry.getBlob().then((blob) => {
        const lines = blob.toString().split('\n').filter(line => {
          return line.length > 0 && line.substr(0, 2) !== '--';
        });
        if (lines[0].substr(0, 2) === '\\i') {
          return Promise.all(
            lines.map((line) => line.split(' ')[1])
              .map((filepath) => getSqlFiles(commit, filepath))
          );
        } else {
          return Promise.all([[entry]]);
        }
      });
    }
    return subEntries.then((nestedEntryList: Array<Array<GITTreeEntry>>) => {
      return [].concat.apply(
        [],
        nestedEntryList
      );
    });
  });
}

export function installFile(db: pgPromise.IDatabase<any>, commit: any, path: string, monitorInstall: boolean = true) {
  return getSqlFiles(commit, path).then((entries: Array<GITTreeEntry>) => {
    // Install triggers
    if (monitorInstall) {
      return db.query(monitoring_triggers).then(() => entries);
    } else {
      return entries;
    }
  }).then((entries) => {
    return entries.reduce((prior, entry) => {
      return prior.then(() => db.task((con) => {
        console.log('loading file:', entry.path());
        return con.query('SET application_name TO $1', entry.name())
        .then(() => entry.getBlob())
        .then((blob: GITBlob) => {
          return con.query(blob.toString());
        });
      }));
    }, Promise.resolve());
  }).then(() => {
    if (monitorInstall) {
      return db.query("select * from deploy.monitoring where type != 'not sure'");
    }
  });
}
