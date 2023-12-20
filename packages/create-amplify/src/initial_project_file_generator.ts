import path from 'path';
import _fs from 'fs/promises';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_logger.js';
import { execa } from 'execa';

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
    private readonly initializeTsConfig: (targetDir: string) => Promise<void>,
    private readonly addLockFile?: (targetDir: string) => void,
    private readonly addTypescript?: (targetDir: string) => Promise<void>,
    private readonly fs = _fs
  ) {}

  private readonly executableName = !process.env.PACKAGE_MANAGER_EXECUTABLE
    ? 'npm'
    : process.env.PACKAGE_MANAGER_EXECUTABLE.startsWith('yarn')
    ? 'yarn'
    : process.env.PACKAGE_MANAGER_EXECUTABLE; // TODO: replace `process.env.PACKAGE_MANAGER_EXECUTABLE` with `getPackageManagerName()` once the test infra is ready.

  /**
   * Copies the template directory to an amplify folder within the projectRoot
   */
  generateInitialProjectFiles = async (): Promise<void> => {
    const targetDir = path.resolve(this.projectRoot, 'amplify');
    await this.fs.mkdir(targetDir, { recursive: true });
    await this.fs.cp(
      new URL('../templates/basic-auth-data/amplify', import.meta.url),
      targetDir,
      { recursive: true }
    );

    const packageJsonContent = { type: 'module' };
    await this.fs.writeFile(
      path.resolve(targetDir, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );

    if (this.addLockFile) {
      this.addLockFile(targetDir);
    }

    if (this.addTypescript) {
      await this.addTypescript(targetDir);
    }

    await this.initializeTsConfig(targetDir);
  };
}
