import { execa as _execa } from 'execa';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller.js';
import { executeWithDebugLogger } from './execute_with_logger.js';

/**
 *
 */
export class NpmPackageManagerController implements PackageManagerController {
  /**
   * Abstraction around npm commands that are needed to initialize a project and install dependencies
   */
  constructor(
    private readonly projectRoot: string,
    private readonly execa = _execa
  ) {}
  private readonly executableName =
    process.env.PACKAGE_MANAGER_EXECUTABLE || 'npm'; // TODO: replace `process.env.PACKAGE_MANAGER_EXECUTABLE` with `getPackageManagerName()` once the test infra is ready.

  /**
   * Installs the given package names as devDependencies
   */
  installDependencies = async (
    packageNames: string[],
    type: DependencyType
  ): Promise<void> => {
    const args = [this.executableName === 'yarn' ? 'add' : 'install'].concat(
      ...packageNames
    );
    if (type === 'dev') {
      args.push('-D');
    }

    try {
      await executeWithDebugLogger(this.projectRoot, 'npm', args, this.execa);
    } catch {
      throw new Error(`\`npm ${args.join(' ')}\` did not exit successfully.`);
    }
  };
}
