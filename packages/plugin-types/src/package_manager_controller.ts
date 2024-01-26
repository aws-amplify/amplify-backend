/**
 * TODO: use the latest execa.
 * execa v8 doesn't support commonjs, so we need to use the types from v5
 * https://github.com/sindresorhus/execa/issues/489#issuecomment-1109983390
 */
import { type ExecaChildProcess } from 'execa';

// TODO: This is a temporary workaround to get the types to compile.
// We need to figure out if we need to move this type from platform-core to plugin-types
/**
 * BackendLocator is an abstraction around locating the backend directory
 */
export class BackendLocator {
  locate: () => string;
  /**
   * constructor
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  constructor(rootDir?: string) {}
}

export enum InvokableCommand {
  DEPLOY = 'deploy',
  DESTROY = 'destroy',
}

type DependencyType = 'dev' | 'prod';

export type PackageManagerController = {
  getPackageManagerCommandArgs: (
    invokableCommand: InvokableCommand,
    backendLocator: BackendLocator
  ) => string[];
  getWelcomeMessage: () => string;
  initializeProject: () => Promise<void>;
  initializeTsConfig: (targetDir: string) => Promise<void>;
  installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void>;
  runWithPackageManager: (
    args: string[] | undefined,
    dir: string,
    options?: {
      env?: Record<string, string>;
      stdin?: 'inherit' | 'pipe' | 'ignore';
      stdout?: 'inherit' | 'pipe' | 'ignore';
      stderr?: 'inherit' | 'pipe' | 'ignore';
      extendEnv?: boolean;
    }
  ) => ExecaChildProcess<string>;
};
