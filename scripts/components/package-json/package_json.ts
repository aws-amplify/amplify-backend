import fsp from 'fs/promises';
import path from 'path';

export type PackageJson = {
  name: string;
  version: string;
  private?: boolean;
  type?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
} & Record<string, unknown>;

/**
 * Reads content of package.json file.
 */
export const readPackageJson = async (
  packageDirectoryPath: string
): Promise<PackageJson> => {
  const packageJsonPath = path.join(packageDirectoryPath, 'package.json');
  return JSON.parse(
    await fsp.readFile(packageJsonPath, 'utf-8')
  ) as PackageJson;
};

/**
 * Writes package json content to file.
 */
export const writePackageJson = async (
  packageDirectoryPath: string,
  packageJson: PackageJson
): Promise<void> => {
  const packageJsonPath = path.join(packageDirectoryPath, 'package.json');
  await fsp.writeFile(
    packageJsonPath,
    `${JSON.stringify(packageJson, null, 2)}\n`
  );
};
