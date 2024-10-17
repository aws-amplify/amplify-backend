import _path from 'path';
import _fsp from 'fs/promises';
import { type PackageManagerController } from '@aws-amplify/plugin-types';

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
    private readonly packageManagerController: PackageManagerController,
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

    await this.packageManagerController.initializeTsConfig(targetDir);
  };
}
