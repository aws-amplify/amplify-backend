import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

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
}
