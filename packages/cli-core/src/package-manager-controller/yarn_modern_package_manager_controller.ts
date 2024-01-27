import { existsSync as _existsSync } from 'fs';
import _fsp from 'fs/promises';
import { execa as _execa } from 'execa';
import * as _path from 'path';
import { LogLevel } from '@aws-amplify/cli-core';
import { printer } from '../printer.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_debugger_logger.js';
import { PackageManagerControllerBase } from './package_manager_controller_base.js';
import { DependencyType } from './package_manager_controller_factory.js';

/**
 * YarnModernPackageManagerController is an abstraction around yarn modern (yarn v2+) commands that are needed to initialize a project and install dependencies
 */
export class YarnModernPackageManagerController extends PackageManagerControllerBase {
  /**
   * constructor
   */
  constructor(
    readonly projectRoot: string = './',
    protected readonly fsp = _fsp,
    protected readonly path = _path,
    protected readonly execa = _execa,
    protected readonly executeWithDebugLogger = _executeWithDebugLogger,
    protected readonly existsSync = _existsSync
  ) {
    super(
      projectRoot,
      'yarn',
      'yarn',
      ['init', '--yes'],
      'add',
      fsp,
      path,
      execa,
      executeWithDebugLogger,
      existsSync
    );
  }

  installDependencies: (
    packageNames: string[],
    type: DependencyType
  ) => Promise<void> = async (packageNames, type) => {
    await this.addDependencies(this.projectRoot);
    await super.installDependencies(packageNames, type);
  };

  initializeTsConfig = async (targetDir: string) => {
    await this.addLockFile(targetDir);
    await this.addTypescript(targetDir);
    await super.initializeTsConfig(targetDir);
  };

  /**
   * addLockFile - adds a yarn.lock file to the project root for yarn v2+
   */
  private addLockFile = async (targetDir: string) => {
    try {
      await this.fsp.writeFile(this.path.resolve(targetDir, 'yarn.lock'), '');
    } catch (error) {
      if (typeof error === 'string') {
        printer.log(
          `Error creating ${targetDir}/yarn.lock ${error}}`,
          LogLevel.ERROR
        );
      } else if (error instanceof Error) {
        printer.log(
          `Error creating ${targetDir}/yarn.lock ${error.message}}`,
          LogLevel.ERROR
        );
      }
    }
  };

  /**
   * addTypescript - initializes a tsconfig.json file in the project root
   */
  private addTypescript = async (targetDir: string) => {
    await this.executeWithDebugLogger(
      targetDir,
      'yarn',
      ['add', 'typescript@^5'],
      this.execa
    );
  };

  private addDependencies = async (targetDir: string) => {
    await this.executeWithDebugLogger(
      targetDir,
      'yarn',
      ['add', '-D', 'tsx', 'esbuild'],
      this.execa
    );
  };
}
