import { Dependency } from '@aws-amplify/plugin-types';
import fsp from 'fs/promises';
import path from 'path';
import { LockFileContents, LockFileReader } from './types.js';
import { printer } from '../../printer.js';
import { LogLevel } from '../../printer/printer.js';

/**
 * BunLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class BunLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<
    LockFileContents | undefined
  > => {
    const dependencies: Array<Dependency> = [];
    const bunLockJsonPath = path.resolve(process.cwd(), 'bun.lock');
    let bunLockJson: unknown;
    try {
      const jsonLockContents = await fsp.readFile(bunLockJsonPath, 'utf-8');
      bunLockJson = JSON.parse(jsonLockContents);
    } catch {
      printer.log(
        `Failed to get lock file contents because ${bunLockJsonPath} does not exist or is not parse-able`,
        LogLevel.DEBUG,
      );
      return;
    }

    // Narrow the parsed JSON to an object with optional packages record
    const bunLockObject =
      typeof bunLockJson === 'object' && bunLockJson !== null
        ? (bunLockJson as { packages?: Record<string, unknown> })
        : undefined;

    if (!bunLockObject || !bunLockObject.packages) {
      return { dependencies };
    }

    const packages = bunLockObject.packages;
    for (const key in packages) {
      const entry = packages[key] as unknown;
      // Each package entry is an array, first element is a string like
      // "name@version", or "name@workspace:path", etc.
      if (Array.isArray(entry) && typeof entry[0] === 'string') {
        const pkgString = entry[0];
        const lastAtIndex = pkgString.lastIndexOf('@');
        if (lastAtIndex <= 0) {
          // Invalid form or missing separator
          continue;
        }

        const dependencyName = pkgString.slice(0, lastAtIndex);
        const dependencyVersion = pkgString.slice(lastAtIndex + 1);

        // Only include resolved npm packages that have a concrete version
        // Skip workspace/link/file/git/github/root forms which are not versions
        if (/^\d/.test(dependencyVersion)) {
          dependencies.push({
            name: dependencyName,
            version: dependencyVersion,
          });
        }
      }
    }

    return { dependencies };
  };
}
