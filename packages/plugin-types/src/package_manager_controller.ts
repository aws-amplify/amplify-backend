import { Readable } from 'node:stream';

/*
 * Execa v6 and onwards doesn't support commonjs, so we need to define our own types
 * to match execa functionalities we use.
 * https://github.com/sindresorhus/execa/issues/489#issuecomment-1109983390
 */

export type ExecaOptions = {
  stdin?: 'inherit';
  stdout?: 'pipe';
  stderr?: 'pipe';
  extendEnv?: boolean;
  env?: Record<string, string>;
};

export type ExecaChildProcessResult = {
  exitCode?: number | undefined;
};

export type ExecaChildProcess = {
  stdout: Readable | null;
  stderr: Readable | null;
} & Promise<ExecaChildProcessResult>;

export type Dependency = { name: string; version: string };

export type LockFileContents = {
  dependencies: Array<Dependency>;
};

export type LockFileReader = {
  getLockFileContentsFromCwd: () => Promise<LockFileContents>;
};

export type PackageManagerController = {
  initializeProject: () => Promise<void>;
  initializeTsConfig: (targetDir: string) => Promise<void>;
  installDependencies: (
    packageNames: string[],
    type: 'dev' | 'prod'
  ) => Promise<void>;
  runWithPackageManager: (
    args: string[] | undefined,
    dir: string,
    options?: ExecaOptions
  ) => ExecaChildProcess;
  getCommand: (args: string[]) => string;
  allowsSignalPropagation: () => boolean;
  getDependencies: () => Promise<Array<Dependency>>;
};
