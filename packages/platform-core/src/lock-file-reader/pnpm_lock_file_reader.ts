import fsp from 'fs/promises';
import path from 'path';
import {
  Dependencies,
  LockFileContents,
  LockFileReader,
} from './lock_file_reader_factory';

/**
 * PnpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class PnpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const eolRegex = '[\r\n]';
    const dependencies: Dependencies = [];
    const pnpmLockPath = path.resolve(process.cwd(), 'pnpm-lock.yaml');

    try {
      const pnpmLockContents = await fsp.readFile(pnpmLockPath, 'utf-8');
      const pnpmLockContentsArray = pnpmLockContents.split(
        new RegExp(`${eolRegex}${eolRegex}`)
      );

      const startOfPackagesIndex = pnpmLockContentsArray.indexOf('packages:');
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
    } catch (error) {
      // We failed to get lock file contents either because file doesn't exist or it is not parse-able
      return { dependencies };
    }

    return { dependencies };
  };
}
