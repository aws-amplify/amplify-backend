import path from 'path';
import _fs from 'fs/promises';
import { PackageJson } from './package_json_reader.js';
import { TsConfigInitializer } from './tsconfig_initializer.js';

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
    private readonly tsConfigInitializer: TsConfigInitializer,
    private readonly fs = _fs
  ) {}

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

    const packageJsonContent: PackageJson = { type: 'module' };
    await this.fs.writeFile(
      path.resolve(targetDir, 'package.json'),
      JSON.stringify(packageJsonContent, null, 2)
    );

    // there's a bit of tight coupling here because this class sets type: module in the package.json for the directory and tsConfigInitializer create a TS config for ESM
    // it's not obvious at this point what a better abstraction would be for this, so leaving as-is
    await this.tsConfigInitializer.ensureInitialized(targetDir);
  };
}
