import _fsp from 'fs/promises';
import { execa as _execa } from 'execa';
import * as _path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { PackageManagerController } from './package_manager_controller.js';

/**
 * YarnModernPackageManagerController is an abstraction around yarn modern (yarn v2+) commands that are needed to initialize a project and install dependencies
 */
export class YarnModernPackageManagerController extends PackageManagerController {
  /**
   * constructor
   */
  constructor(
    readonly projectRoot: string,
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
        logger.error(`Error creating ${targetDir}/yarn.lock ${error}}`);
      } else if (error instanceof Error) {
        logger.error(`Error creating ${targetDir}/yarn.lock ${error.message}}`);
      }
    }
  };

  /**
   * initializeTsConfig - initializes a tsconfig.json file in the project root
   */
  private addTypescript = async (targetDir: string) => {
    await this.executeWithDebugLogger(
      targetDir,
      'yarn',
      ['add', 'typescript@^5'],
      this.execa
    );
  };
}
