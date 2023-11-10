import { execa as _execa } from 'execa';
import {
  DependencyType,
  PackageManagerController,
} from './package_manager_controller.js';

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
  private readonly executableName = !process.env.PACKAGE_MANAGER_EXECUTABLE
    ? 'npm'
    : process.env.PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
    ? 'yarn'
    : process.env.PACKAGE_MANAGER_EXECUTABLE; // TODO: replace `process.env.PACKAGE_MANAGER_EXECUTABLE` with `getPackageManagerName()` once the test infra is ready.

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
    await this.execa(this.executableName, args, {
      stdio: 'inherit',
      cwd: this.projectRoot,
    });
  };
}
