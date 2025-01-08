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
 * YarnClassicLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class YarnClassicLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const yarnLockPath = path.resolve(process.cwd(), 'yarn.lock');

    try {
      await fsp.access(yarnLockPath);
    } catch (error) {
      throw new AmplifyUserError('InvalidPackageLockJsonError', {
        message: `Could not find a yarn.lock file at ${yarnLockPath}`,
        resolution: `Ensure that ${yarnLockPath} exists and is a valid yarn.lock file`,
      });
    }

    const dependencies: Dependencies = [];

    try {
      const yarnLockContents = await fsp.readFile(yarnLockPath, 'utf-8');
      const yarnLockContentsArray = yarnLockContents.split(EOL + EOL);

      // Slice to remove comment block at the start of the lock file
      for (const yarnDependencyBlock of yarnLockContentsArray.slice(1)) {
        const yarnDependencyLines = yarnDependencyBlock.trim().split(EOL);
        const yarnDependencyName = yarnDependencyLines[0];
        const yarnDependencyVersion = yarnDependencyLines[1];

        // Get dependency name before versioning info
        const dependencyName = yarnDependencyName
          .slice(0, yarnDependencyName.lastIndexOf('@'))
          .replaceAll(/"/g, '');
        const versionMatch = yarnDependencyVersion.match(/"(.*)"/);
        const dependencyVersion = versionMatch ? versionMatch[1] : '';

        dependencies.push({ name: dependencyName, version: dependencyVersion });
      }
    } catch (error) {
      throw new AmplifyUserError(
        'InvalidPackageLockJsonError',
        {
          message: `Could not parse the contents of ${yarnLockPath}`,
          resolution: `Ensure that ${yarnLockPath} exists and is a valid yarn.lock file`,
        },
        error as Error
      );
    }

    return { dependencies };
  };
}
