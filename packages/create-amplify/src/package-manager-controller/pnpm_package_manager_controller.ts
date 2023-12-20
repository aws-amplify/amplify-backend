import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

/**
 * PnpmPackageManagerController is an abstraction around pnpm commands that are needed to initialize a project and install dependencies
 */
export class PnpmPackageManagerController extends PackageManagerController {
  /**
   * constructor
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'pnpm';
    this.binaryRunner = 'pnpm';
    this.installCommand = 'add';
    this.initDefault = ['init'];
  }
}
