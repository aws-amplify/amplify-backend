import fs from 'fs';
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
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'yarn';
    this.binaryRunner = 'yarn';
    this.installCommand = 'add';
    this.initDefault = ['init', '--yes'];
  }

  initializeTsConfig = async (targetDir: string) => {
    await this.addLockFile(targetDir);
    await this.addTypescript(targetDir);
    await this.initializeTsConfig(targetDir);
  };

  /**
   * addLockFile - adds a yarn.lock file to the project root for yarn v2+
   */
  private addLockFile = (targetDir: string) => {
    fs.writeFile(this.path.resolve(targetDir, 'yarn.lock'), '', (err) => {
      if (err) {
        logger.error(`Error creating ${targetDir}/yarn.lock ${err.message}}`);
      } else {
        logger.info(`${targetDir}/yarn.lock created successfully.`);
      }
    });
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
