import _path from 'path';
import _fsp from 'fs/promises';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_logger.js';
import { type PackageManagerControllerType } from './package-manager-controller/package_manager_controller.js';

/**
 * InitialProjectFileGenerator is responsible for copying getting started template to a new project directory
 */
export class InitialProjectFileGenerator {
  /**
   * Responsible for copying getting started template to a new project directory
   * fs is injected for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageManagerController: PackageManagerControllerType,
    private readonly fsp = _fsp,
    private readonly path = _path
  ) {}

  /**
   * Copies the template directory to an amplify folder within the projectRoot
   */
  generateInitialProjectFiles = async (): Promise<void> => {
    const targetDir = this.path.resolve(this.projectRoot, 'amplify');
    await this.fsp.mkdir(targetDir, { recursive: true });
    await this.fsp.cp(
      new URL('../templates/basic-auth-data/amplify', import.meta.url),
      targetDir,
      { recursive: true }
    );

    const packageJsonContent = { type: 'module' };
    await this.fsp.writeFile(
      this.path.resolve(targetDir, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );

    if (this.packageManagerController.addLockFile) {
      this.packageManagerController.addLockFile(targetDir);
    }

    if (this.packageManagerController.addTypescript) {
      await this.packageManagerController.addTypescript(targetDir);
    }

    await this.packageManagerController.initializeTsConfig(targetDir);
  };
}
