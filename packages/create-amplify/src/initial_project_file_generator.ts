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
    private readonly addLockFile?: (targetDir: string) => void,
    private readonly fs = _fs,
    private readonly executeWithDebugLogger = _executeWithDebugLogger
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

    await this.initializeTsConfig(targetDir);
  };

  private initializeTsConfig = async (targetDir: string): Promise<void> => {
    const tscArgs = [
      'tsc',
      '--init',
      '--resolveJsonModule',
      'true',
      '--module',
      'es2022',
      '--moduleResolution',
      'bundler',
      '--target',
      'es2022',
    ];

    if (this.executableName.startsWith('yarn')) {
      await this.executeWithDebugLogger(
        targetDir,
        'yarn',
        ['add', 'typescript@^5'],
        execa
      );
    }

    await this.executeWithDebugLogger(
      targetDir,
      this.executableName === 'npm'
        ? 'npx'
        : this.executableName.startsWith('yarn')
        ? 'yarn'
        : this.executableName,
      tscArgs,
      execa
    );
  };
}
