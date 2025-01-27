import { Dependency } from '@aws-amplify/plugin-types';

export type LockFileContents = {
  dependencies: Array<Dependency>;
};

export type LockFileReader = {
  getLockFileContentsFromCwd: () => Promise<LockFileContents | undefined>;
};
