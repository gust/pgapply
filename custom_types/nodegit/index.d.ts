type GITBlob = {
  toString: () => string
};

type GITTree = {
  entries: () => Array<GITTreeEntry>
};

type GITTreeEntry = {
  getBlob: () => Promise<GITBlob>
  getTree: () => Promise<GITTree>
  isFile: () => boolean
  isTree: () => boolean
  name: () => string
  path: () => string
};

type GITBranch = {};
type GITCommit = {
  getEntry: (path: string) => Promise<GITTreeEntry>
  sha: () => string
};

type GITRepository = {
  getCurrentBranch: () => Promise<GITBranch>;
  getBranchCommit: (branch: GITBranch) => Promise<GITCommit>;
};

type Repository = {
  open: (path: string) => Promise<GITRepository>
};

declare module 'nodegit' {
  let Repository: Repository;
}
