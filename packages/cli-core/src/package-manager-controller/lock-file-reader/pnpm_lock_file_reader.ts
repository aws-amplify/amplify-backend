import { Dependency } from '@aws-amplify/plugin-types';
import fsp from 'fs/promises';
import path from 'path';
import { LockFileContents, LockFileReader } from './types.js';
import { printer } from '../../printer.js';
import { LogLevel } from '../../printer/printer.js';

/**
 * PnpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class PnpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<
    LockFileContents | undefined
  > => {
    const eolRegex = '[\r\n]';
    const dependencies: Array<Dependency> = [];
    const pnpmLockPath = path.resolve(process.cwd(), 'pnpm-lock.yaml');

    try {
      const pnpmLockContents = await fsp.readFile(pnpmLockPath, 'utf-8');
      const pnpmLockContentsArray = pnpmLockContents.split(
        new RegExp(`${eolRegex}${eolRegex}`)
      );

      const startOfPackagesIndex = pnpmLockContentsArray.indexOf('packages:');
      if (startOfPackagesIndex === -1) {
        return { dependencies };
      }
      const pnpmLockPackages = pnpmLockContentsArray.slice(
        startOfPackagesIndex + 1
      );

      for (const pnpmDependencyBlock of pnpmLockPackages) {
        // Get line that contains dependency name and version and remove quotes and colon
        const pnpmDependencyLine = pnpmDependencyBlock
          .trim()
          .split(new RegExp(eolRegex))[0]
          .replaceAll(/[':]/g, '');
        const dependencyName = pnpmDependencyLine.slice(
          0,
          pnpmDependencyLine.lastIndexOf('@')
        );
        const dependencyVersion = pnpmDependencyLine.slice(
          pnpmDependencyLine.lastIndexOf('@') + 1
        );

        dependencies.push({ name: dependencyName, version: dependencyVersion });
      }
    } catch {
      printer.log(
        `Failed to get lock file contents because ${pnpmLockPath} does not exist or is not parse-able`,
        LogLevel.DEBUG
      );
      return;
    }

    return { dependencies };
  };
}
