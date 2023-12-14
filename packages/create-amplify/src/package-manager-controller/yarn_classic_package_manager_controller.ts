import { existsSync as _existsSync } from 'fs';
import { execa as _execa } from 'execa';
import { executeWithDebugLogger } from '../execute_with_logger.js';
import { type PackageManagerProps } from './package_manager.js';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller_factory.js';

/**
 *
 */
export class YarnClassicPackageManagerController
  implements PackageManagerController
{
  protected readonly execa = _execa;
  protected readonly packageManager: PackageManagerProps = {
    name: 'yarn-classic',
    executable: 'yarn',
    binaryRunner: 'yarn',
    installCommand: 'add',
    lockFile: 'yarn.lock',
    initDefault: ['init', '--yes'],
  };

  /**
   * Abstraction around yarn classic commands that are needed to initialize a project and install dependencies
   */
  constructor(protected readonly projectRoot: string) {}

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [`${this.packageManager.installCommand}`].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    await executeWithDebugLogger(
      this.projectRoot,
      this.packageManager.executable,
      args,
      this.execa
    );
  };
}
