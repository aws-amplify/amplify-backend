/**
 * TODO: use the latest execa.
 * Issue: https://github.com/aws-amplify/amplify-backend/issues/962
 * execa v8 doesn't support commonjs, so we need to use the types from v5
 * https://github.com/sindresorhus/execa/issues/489#issuecomment-1109983390
 */
import { type ExecaChildProcess, type Options } from 'execa';

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
    options?: Options<'utf8'>
  ) => ExecaChildProcess;
  getCommand: (args: string[]) => string;
};
