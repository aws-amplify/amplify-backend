import fsp from 'fs/promises';

/**
 * Get dependency names and versions from package-lock.json
 */
export const getDependenciesFromPackageLock = async (
  packageLockJsonPath: string,
): Promise<Dependency[]> => {
  const dependencies: Dependency[] = [];
  const packageLockContents = JSON.parse(
    await fsp.readFile(packageLockJsonPath, 'utf-8'),
  ) as PackageLockJson;

  for (const key in packageLockContents.packages) {
    if (key === '') {
      // Skip root project in packages
      continue;
    }
    const dependencyVersion = packageLockContents.packages[key].version;

    // Version may not exist if package is a symbolic link
    if (dependencyVersion) {
      // Remove "node_modules/" prefix
      const dependencyName = key.replace(/^node_modules\//, '');
      dependencies.push({
        name: dependencyName,
        version: dependencyVersion,
      });
    }
  }

  return dependencies;
};

type PackageLockJson = {
  name: string;
  version: string;
  lockfileVersion: number;
  packages: Record<string, Package>;
};

type Package = {
  version: string;
} & Record<string, unknown>;

export type Dependency = {
  name: string;
  version: string;
};
