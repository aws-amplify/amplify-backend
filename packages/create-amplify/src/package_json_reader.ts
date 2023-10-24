import { readFile as _readFile } from 'fs/promises';
import path from 'path';

export type PackageJson = {
  name: string;
  version: string;
  type?: 'module' | 'commonjs';
};

/**
 * Reads a content of package json.
 */
export class PackageJsonReader {
  /**
   * Creates a package.json reader.
   */
  constructor(private readonly readFile = _readFile) {}

  readPackageJson = async (packageRootPath: string): Promise<PackageJson> => {
    const packageJsonContent = (
      await this.readFile(path.resolve(packageRootPath, 'package.json'))
    ).toString();

    return JSON.parse(packageJsonContent) as PackageJson;
  };
}
