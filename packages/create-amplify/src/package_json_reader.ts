import { readFile as _readFile } from 'fs/promises';
import path from 'path';

export type PackageJson = {
  name?: string;
  version?: string;
  type?: 'module' | 'commonjs';
};

/**
 * Reads a content of package json.
 */
export class PackageJsonReader {
  /**
   * Creates a package.json reader.
   */
  constructor(
    private readonly packageRootPath: string,
    private readonly readFile = _readFile
  ) {}

  readPackageJson = async (): Promise<PackageJson> => {
    const packageJsonContent = await this.readFile(
      path.resolve(this.packageRootPath, 'package.json'),
      'utf-8'
    );
    return JSON.parse(packageJsonContent) as PackageJson;
  };
}
