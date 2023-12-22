import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

/**
 * YarnClassicPackageManagerController is an abstraction around yarn classic commands that are needed to initialize a project and install dependencies
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

  initializeTsConfig = async (targetDir: string) => {
    await this.addTypescript(targetDir);
    await this.initializeTsConfig(targetDir);
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
