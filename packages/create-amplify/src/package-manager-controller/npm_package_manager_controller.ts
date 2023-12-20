import { PackageManagerController } from './package_manager_controller.js';

/**
 * NpmPackageManagerController is an abstraction around npm commands that are needed to initialize a project and install dependencies
 */
export class NpmPackageManagerController extends PackageManagerController {
  /**
   * constructor
   */
  constructor(readonly projectRoot: string) {
    super(projectRoot);
    this.executable = 'npm';
    this.binaryRunner = 'npx';
    this.installCommand = 'install';
    this.initDefault = ['init', '--yes'];
  }
}
