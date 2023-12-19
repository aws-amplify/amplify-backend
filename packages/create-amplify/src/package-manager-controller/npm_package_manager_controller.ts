import { execa as _execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

/**
 *
 */
export class NpmPackageManagerController extends PackageManagerController {
  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'npm';
    this.binaryRunner = 'npx';
    this.installCommand = 'install';
    this.initDefault = ['init', '--yes'];
  }
}
