import { existsSync as _existsSync } from 'fs';
import * as path from 'path';
import { execa as _execa } from 'execa';
import { PackageJsonReader } from './package_json_reader.js';

/**
 * Ensure that the current working directory is a valid TypeScript project
 */
export class TsConfigInitializer {
  /**
   * injecting console and fs for testing
   */
  constructor(
    private readonly projectRoot: string,
    private readonly packageJsonReader: PackageJsonReader,
    private readonly logger: typeof console = console,
    private readonly existsSync = _existsSync,
    private readonly execa = _execa
  ) {}
  private readonly executableName = !process.env.PACKAGE_MANAGER_EXECUTABLE
    ? 'npx'
    : process.env.PACKAGE_MANAGER_EXECUTABLE === 'yarn-stable'
    ? 'yarn'
    : process.env.PACKAGE_MANAGER_EXECUTABLE; // TODO: replace `process.env.PACKAGE_MANAGER_EXECUTABLE` with `getPackageManagerName()` once the test infra is ready.

  /**
   * If tsconfig.json already exists, this is a noop. Otherwise, `npx tsc --init` is executed to create a tsconfig.json file
   */
  ensureInitialized = async (): Promise<void> => {
    if (this.tsConfigJsonExists()) {
      // if tsconfig.json already exists, no need to do anything
      return;
    }
    this.logger.log(
      `No tsconfig.json file found in the current directory. Running \`${
        this.executableName === 'npm' ? 'npx' : this.executableName
      } tsc --init\`...`
    );

    const packageJson = await this.packageJsonReader.readPackageJson();
    const tscArgs = ['tsc', '--init', '--resolveJsonModule', 'true'];
    if (packageJson.type === 'module') {
      tscArgs.push(
        '--module',
        'node16',
        '--moduleResolution',
        'node16',
        '--target',
        'es2022'
      );
    } else {
      tscArgs.push(
        '--module',
        'commonjs',
        '--moduleResolution',
        'node',
        '--target',
        'es2018'
      );
    }

    try {
      await this.execa(
        this.executableName === 'npm' ? 'npx' : this.executableName,
        tscArgs,
        {
          stdio: 'inherit',
          cwd: this.projectRoot,
        }
      );
    } catch {
      throw new Error(
        `\`${
          this.executableName === 'npm' ? 'npx' : this.executableName
        } tsc --init\` did not exit successfully. Initialize a valid TypeScript configuration before continuing.`
      );
    }

    if (!this.tsConfigJsonExists()) {
      // this should only happen if the customer exits out of npx tsc --init before finishing
      throw new Error(
        `tsconfig.json does not exist after running \`${
          this.executableName === 'npm' ? 'npx' : this.executableName
        } tsc --init\`. Initialize a valid TypeScript configuration before continuing.`
      );
    }
  };

  /**
   * Check if a tsconfig.json file exists in projectRoot
   */
  private tsConfigJsonExists = (): boolean => {
    return this.existsSync(path.resolve(this.projectRoot, 'tsconfig.json'));
  };
}
