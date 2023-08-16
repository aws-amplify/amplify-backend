import { execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

/**
 * Abstraction around npm commands that are needed to initialize a project and install dependencies
 */
export class NpmPackageManagerController implements PackageManagerController {
  private readonly executableName = 'npm';

  /**
   * Installs the given package names as devDependencies
   */
  async installDevDependencies(packageNames: string[]): Promise<void> {
    const args = ['install'].concat(...packageNames).concat('--save-dev');
    await execa(this.executableName, args, { stdio: 'inherit' });
  }
}
