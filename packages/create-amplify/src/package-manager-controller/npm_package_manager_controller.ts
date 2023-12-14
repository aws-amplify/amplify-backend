import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import {
  DependencyType,
  PackageManagerController,
  type PackageManagerProps,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  protected readonly execa = _execa;
  protected readonly packageManagerProps: PackageManagerProps = {
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
  constructor(protected readonly projectRoot: string) {}

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
}
