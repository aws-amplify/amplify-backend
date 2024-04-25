import { existsSync as _existsSync } from 'fs';
import _fsp from 'fs/promises';
import { type ExecaChildProcess, type Options, execa as _execa } from 'execa';
import * as _path from 'path';
import { type PackageManagerController } from '@aws-amplify/plugin-types';
import { LogLevel } from '../printer/printer.js';
import { printer } from '../printer.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { getPackageManagerRunnerName } from './get_package_manager_name.js';

/**
 * PackageManagerController is an abstraction around package manager commands that are needed to initialize a project and install dependencies
 */
export abstract class PackageManagerControllerBase
  implements PackageManagerController
{
  protected readonly binaryRunner: string;
  /**
   * constructor - sets the project root
   */
  constructor(
    protected readonly cwd: string,
    protected readonly executable: string,
    protected readonly initDefault: string[],
    protected readonly installCommand: string,
    protected readonly fsp = _fsp,
    protected readonly path = _path,
    protected readonly execa = _execa,
    protected readonly executeWithDebugLogger = _executeWithDebugLogger,
    protected readonly existsSync = _existsSync
  ) {
    this.binaryRunner = getPackageManagerRunnerName();
  }

  /**
   * installDependencies - installs dependencies in the project root
   */
  async installDependencies(
    packageNames: string[],
    type: 'dev' | 'prod'
  ): Promise<void> {
    const args = [`${this.installCommand}`].concat(...packageNames);
    if (type === 'dev') {
      args.push('-D');
    }

    await this.executeWithDebugLogger(
      this.cwd,
      this.executable,
      args,
      this.execa
    );
  }

  /**
   * initializeProject - initializes a project in the project root by checking the package.json file
   */
  initializeProject = async () => {
    if (this.packageJsonExists(this.cwd)) {
      // if package.json already exists, no need to do anything
      return;
    }

    printer.log(
      `No package.json file found in the current directory. Running \`${this.executable} init\`...`,
      LogLevel.DEBUG
    );

    try {
      await this.executeWithDebugLogger(
        this.cwd,
        this.executable,
        this.initDefault,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${this.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.cwd)) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        `package.json does not exist after running \`${this.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  };

  /**
   * initializeTsConfig - initializes a tsconfig.json file in the project root
   *
   * When changing this method, double check if a corresponding change is needed in the integration test setup in `setup_dir_as_esm_module.ts`.
   */
  async initializeTsConfig(targetDir: string) {
    const tsConfigTemplate = {
      compilerOptions: {
        target: 'es2022',
        module: 'es2022',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        esModuleInterop: true,
        forceConsistentCasingInFileNames: true,
        strict: true,
        skipLibCheck: true,
        // The path here is coupled with backend-function's generated typedef file path
        paths: { '$amplify/*': ['../.amplify/generated/*'] },
      },
    };
    const tsConfigPath = this.path.resolve(targetDir, 'tsconfig.json');
    await this.fsp.writeFile(
      tsConfigPath,
      JSON.stringify(tsConfigTemplate, null, 2),
      'utf-8'
    );
  }

  /**
   * runWithPackageManager - Factory function that runs a command with the specified package manager's binary runner
   */
  runWithPackageManager(
    args: string[] = [],
    dir: string,
    options?: Options<'utf8'>
  ): ExecaChildProcess {
    return this.executeWithDebugLogger(
      dir,
      this.binaryRunner,
      args,
      this.execa,
      options
    );
  }

  getCommand = (args: string[]) => `${this.binaryRunner} ${args.join(' ')}`;

  /**
   * Check if a package.json file exists in projectRoot
   */
  private packageJsonExists = (projectRoot: string): boolean => {
    return this.existsSync(this.path.resolve(projectRoot, 'package.json'));
  };
}
