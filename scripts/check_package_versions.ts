import { glob } from 'glob';
import path from 'path';
import * as fs from 'fs/promises';

const expectedVersionPrefix = '0.';

/**
 * script that verifies that all packages in the repo are on 0.x.x version numbers.
 * This is to prevent accidental major version bumps.
 *
 * Once we GA, this check should be updated to ensure we don't accidentally update to 2.x.x
 */

const packagePaths = await glob('./packages/*');

for (const packagePath of packagePaths) {
  const packageJsonPath = path.resolve(packagePath, 'package.json');
  const { version } = JSON.parse(
    await fs.readFile(packageJsonPath, 'utf-8')
  ) as { version: string };
  if (!version.startsWith(expectedVersionPrefix)) {
    throw new Error(
      `Expected package version to start with "${expectedVersionPrefix}" but found version ${version} in ${packageJsonPath}.`
    );
  }
}
