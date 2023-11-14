import fs from 'fs';

/**
 * return the version of the library package from the package json
 */
export const getLibraryVersion = (absolutePackageJsonPath: string): string => {
  if (!fs.existsSync(absolutePackageJsonPath)) {
    throw new Error(
      `Could not find ${absolutePackageJsonPath} to load library version from`
    );
  }
  const packageJsonContents = JSON.parse(
    // we have to use sync fs methods here because this is part of cdk synth
    fs.readFileSync(absolutePackageJsonPath, 'utf-8')
  );
  const libraryVersion = packageJsonContents.version;
  if (typeof libraryVersion !== 'string') {
    throw new Error(
      `Could not parse library version from ${absolutePackageJsonPath}`
    );
  }
  return libraryVersion;
};
