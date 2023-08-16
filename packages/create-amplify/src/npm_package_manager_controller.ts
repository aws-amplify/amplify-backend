import path from 'path';
import fs from 'fs';
import { execa } from 'execa';
import { PackageManagerController } from './package_manager_controller.js';

/**
 * Abstraction around npm commands that are needed to initialize a project and install dependencies
 */
export class NpmPackageManagerController implements PackageManagerController {
  private readonly executableName = 'npm';

  /**
   * Initializes a new npm project if the current directory does not already have a package.json file
   */
  async ensureInitialized(): Promise<void> {
    const testPackageJson = path.resolve(process.cwd(), 'package.json');
    if (fs.existsSync(testPackageJson)) {
      // current directory is already an initialized npm project
      return;
    }
    console.log(`Initializing a new npm project...`);
    await execa(this.executableName, ['init'], { stdio: 'inherit' });
  }

  /**
   * Installs the given package names as devDependencies
   */
  async installDevDependencies(packageNames: string[]): Promise<void> {
    const args = ['install'].concat(...packageNames).concat('--save-dev');
    await execa(this.executableName, args, { stdio: 'inherit' });
  }
}
