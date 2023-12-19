import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { DependencyType } from './package_manager_controller_factory.js';
import { PackageManagerController } from './package_manager_controller.js';

/**
 *
 */
export class PnpmPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around pnpm commands that are needed to initialize a project and install dependencies
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'pnpm';
    this.binaryRunner = 'pnpm';
    this.installCommand = 'add';
    this.initDefault = ['init'];
  }
}
