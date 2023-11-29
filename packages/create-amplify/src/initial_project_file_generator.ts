import path from 'path';
import fs from 'fs';
import _fs from 'fs/promises';
import { executeWithDebugLogger as _executeWithDebugLogger } from './execute_with_logger.js';
import { execa } from 'execa';

/**
 *
 */
export class InitialProjectFileGenerator {
  /**
   * Responsible for copying getting started template to a new project directory
   * fs is injected for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly fs = _fs,
    private readonly executeWithDebugLogger = _executeWithDebugLogger
  ) {}

  private readonly executableName = !process.env.PACKAGE_MANAGER_EXECUTABLE
    ? 'npm'
    : process.env.PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
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

    if (process.env.PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable') {
      fs.writeFile(path.resolve(targetDir, 'yarn.lock'), '', (err) => {
        if (err) {
          console.error(`Error creating ${targetDir}/${targetDir}`, err);
        } else {
          console.log(`${targetDir}/{yarn.lock created successfully.`);
        }
      });
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
      'node16',
      '--moduleResolution',
      'node16',
      '--target',
      'es2022',
    ];

    if (this.executableName === 'yarn') {
      await this.executeWithDebugLogger(
        targetDir,
        'yarn',
        ['add', 'typescript@^5'],
        execa
      );
    }

    await this.executeWithDebugLogger(
      targetDir,
      this.executableName === 'npm' ? 'npx' : this.executableName,
      tscArgs,
      execa
    );
  };
}
