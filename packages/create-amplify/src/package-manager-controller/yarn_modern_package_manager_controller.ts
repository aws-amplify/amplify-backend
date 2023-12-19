import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { DependencyType } from './package_manager_controller_factory.js';
import { PackageManagerController } from './package_manager_controller.js';

/**
 *
 */
export class YarnModernPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around yarn modern commands that are needed to initialize a project and install dependencies
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'yarn';
    this.binaryRunner = 'yarn';
    this.installCommand = 'add';
    this.initDefault = ['init', '--yes'];
  }
}
