import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import {
  DependencyType,
  PackageManagerController,
  PackageManagerControllerFactory,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  private readonly execa = _execa;
  private readonly packageManagerProps = {
    name: 'npm',
    executable: 'npm',
    binaryRunner: 'npx',
    installCommand: 'install',
    lockFile: 'package-lock.json',
    initDefault: ['init', '--yes'],
  };

  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManagerControllerFactory: PackageManagerControllerFactory
  ) {}

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.packageManagerProps.installCommand}`].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    await executeWithDebugLogger(
      this.projectRoot,
      this.packageManagerProps.executable,
      args,
      this.execa
    );
  };

  ensureInitialized = async () => {
    await this.packageManagerControllerFactory.initializeProject(
      this.packageManagerProps
    );
  };

  initializeAmplifyFolder = async () => {
    await this.packageManagerControllerFactory.initializeProject(
      this.packageManagerProps
    );
  };

  getPackageManagerProps = () => this.packageManagerProps;
}
