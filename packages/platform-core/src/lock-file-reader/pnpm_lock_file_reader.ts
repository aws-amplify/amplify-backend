import fsp from 'fs/promises';
import { EOL } from 'os';
import path from 'path';
import {
  Dependencies,
  LockFileContents,
  LockFileReader,
} from './lock_file_reader_factory';
import { AmplifyUserError } from '../errors';

/**
 * PnpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class PnpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const pnpmLockPath = path.resolve(process.cwd(), 'pnpm-lock.yaml');

    try {
      await fsp.access(pnpmLockPath);
    } catch (error) {
      throw new AmplifyUserError('InvalidPackageLockJsonError', {
        message: `Could not find a pnpm-lock.yaml file at ${pnpmLockPath}`,
        resolution: `Ensure that ${pnpmLockPath} exists and is a valid pnpm-lock.yaml file`,
      });
    }

    const dependencies: Dependencies = [];

    try {
      const pnpmLockContents = await fsp.readFile(pnpmLockPath, 'utf-8');
      const pnpmLockContentsArray = pnpmLockContents.split(EOL + EOL);

      const startOfPackagesIndex = pnpmLockContentsArray.indexOf('packages:');
      const pnpmLockPackages = pnpmLockContentsArray.slice(
        startOfPackagesIndex + 1
      );

      for (const pnpmDependencyBlock of pnpmLockPackages) {
        // Get line that contains dependency name and version and remove quotes and colon
        const pnpmDependencyLine = pnpmDependencyBlock
          .trim()
          .split(EOL)[0]
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
      throw new AmplifyUserError(
        'InvalidPackageLockJsonError',
        {
          message: `Could not parse the contents of ${pnpmLockPath}`,
          resolution: `Ensure that ${pnpmLockPath} exists and is a valid pnpm-lock.yaml file`,
        },
        error as Error
      );
    }

    return { dependencies };
  };
}
