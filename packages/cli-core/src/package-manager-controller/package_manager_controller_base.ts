import { existsSync as _existsSync } from 'fs';
import _fsp from 'fs/promises';
import { type ExecaChildProcess, type Options, execa as _execa } from 'execa';
import * as _path from 'path';
import { type PackageManagerController } from '@aws-amplify/plugin-types';
import { LogLevel } from '../printer/printer.js';
import { printer } from '../printer.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';

/**
 * PackageManagerController is an abstraction around package manager commands that are needed to initialize a project and install dependencies
 */
export abstract class PackageManagerControllerBase
  implements PackageManagerController
{
  /**
   * constructor - sets the project root
   */
  constructor(
    protected readonly projectRoot: string,
    protected readonly executable: string,
    protected readonly binaryRunner: string,
    protected readonly initDefault: string[],
    protected readonly installCommand: string,
    protected readonly fsp = _fsp,
    protected readonly path = _path,
    protected readonly execa = _execa,
    protected readonly executeWithDebugLogger = _executeWithDebugLogger,
    protected readonly existsSync = _existsSync
  ) {}

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
      this.projectRoot,
      this.executable,
      args,
      this.execa
    );
  }

  /**
   * getWelcomeMessage - returns a welcome message for the customer
   */
  getWelcomeMessage = () =>
    `Run \`${this.binaryRunner} amplify help\` for a list of available commands. 
Get started by running \`${this.binaryRunner} amplify sandbox\`.`;

  /**
   * initializeProject - initializes a project in the project root by checking the package.json file
   */
  initializeProject = async () => {
    if (this.packageJsonExists(this.projectRoot)) {
      // if package.json already exists, no need to do anything
      return;
    }

    printer.log(
      `No package.json file found in the current directory. Running \`${this.executable} init\`...`,
      LogLevel.DEBUG
    );

    try {
      await this.executeWithDebugLogger(
        this.projectRoot,
        this.executable,
        this.initDefault,
        this.execa
      );
    } catch {
      throw new Error(
        `\`${this.executable} init\` did not exit successfully. Initialize a valid JavaScript package before continuing.`
      );
    }

    if (!this.packageJsonExists(this.projectRoot)) {
      // this should only happen if the customer exits out of npm init before finishing
      throw new Error(
        `package.json does not exist after running \`${this.executable} init\`. Initialize a valid JavaScript package before continuing.'`
      );
    }
  };

  /**
   * initializeTsConfig - initializes a tsconfig.json file in the project root
   */
  async initializeTsConfig(targetDir: string) {
    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'es2022',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
    ];

    await this.executeWithDebugLogger(
      targetDir,
      this.binaryRunner,
      tscArgs,
      this.execa
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
