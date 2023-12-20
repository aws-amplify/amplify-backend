import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';
import { InitialProjectFileGenerator } from '../initial_project_file_generator.js';

/**
 *
 */
export class YarnClassicPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around yarn classic commands that are needed to initialize a project and install dependencies
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
      undefined,
      this.addTypescript
    );
    await initialProjectFileGenerator.generateInitialProjectFiles();
  };

  /**
   * addLockFile - adds a yarn.lock file to the project root for yarn v2+
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
