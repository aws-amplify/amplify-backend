import fs from 'fs';
import path from 'path';
import { logger } from '../logger.js';
import { executeWithDebugLogger as _executeWithDebugLogger } from '../execute_with_logger.js';
import { PackageManagerController } from './package_manager_controller.js';
import { InitialProjectFileGenerator } from '../initial_project_file_generator.js';

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

  /**
   * generateInitialProjectFiles - generates initial project files
   */
  generateInitialProjectFiles = async () => {
    const initialProjectFileGenerator = new InitialProjectFileGenerator(
      this.projectRoot,
      this.initializeTsConfig,
      this.addLockFile,
      this.addTypescript
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();
  };

  /**
   * addLockFile - adds a yarn.lock file to the project root for yarn v2+
   */
  private addLockFile = (targetDir: string) => {
    fs.writeFile(path.resolve(targetDir, 'yarn.lock'), '', (err) => {
      if (err) {
        logger.error(`Error creating ${targetDir}/yarn.lock ${err.message}}`);
      } else {
        logger.info(`${targetDir}/yarn.lock created successfully.`);
      }
    });
  };

  private addTypescript = async (targetDir: string) => {
    await this.executeWithDebugLogger(
      targetDir,
      'yarn',
      ['add', 'typescript@^5'],
      this.execa
    );
  };
}
