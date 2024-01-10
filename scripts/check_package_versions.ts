import { glob } from 'glob';
import { readPackageJson } from './components/package-json/package_json.js';

const expectedVersionPrefix = '0.';

/**
 * script that verifies that all packages in the repo are on 0.x.x version numbers.
 * This is to prevent accidental major version bumps.
 *
 * Once we GA, this check should be updated to ensure we don't accidentally update to 2.x.x
 */

const packagePaths = await glob('./packages/*');

for (const packagePath of packagePaths) {
  const { version } = await readPackageJson(packagePath);
  if (!version.startsWith(expectedVersionPrefix)) {
    throw new Error(
      `Expected package version to start with "${expectedVersionPrefix}" but found version ${version} in ${packagePath}.`
    );
  }
}
