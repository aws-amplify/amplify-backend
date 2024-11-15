import { glob } from 'glob';
import { readPackageJson } from './components/package-json/package_json.js';

/**
 * script that verifies expected major versions for all packages in the repo.
 * This is to prevent accidental major version bumps.
 */

const packagePaths = await glob('./packages/*');

const getExpectedMajorVersion = (packageName: string) => {
  switch (packageName) {
    case 'ampx':
      return '0.';
    default:
      return '1.';
  }
};

for (const packagePath of packagePaths) {
  const {
    version,
    private: isPrivate,
    name,
  } = await readPackageJson(packagePath);
  if (isPrivate) {
    continue;
  }
  const expectedMajorVersion = getExpectedMajorVersion(name);
  if (!version.startsWith(expectedMajorVersion)) {
    throw new Error(
      `Expected package ${name} version to start with "${expectedMajorVersion}" but found version ${version}.`
    );
  }
}
