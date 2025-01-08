import fsp from 'fs/promises';
import path from 'path';
import {
  Dependencies,
  LockFileContents,
  LockFileReader,
} from './lock_file_reader_factory';

/**
 * YarnClassicLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class YarnClassicLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const eolRegex = '[\r\n]';
    const dependencies: Dependencies = [];
    const yarnLockPath = path.resolve(process.cwd(), 'yarn.lock');

    try {
      const yarnLockContents = await fsp.readFile(yarnLockPath, 'utf-8');
      const yarnLockContentsArray = yarnLockContents.split(
        new RegExp(`${eolRegex}${eolRegex}`)
      );

      // Slice to remove comment block at the start of the lock file
      for (const yarnDependencyBlock of yarnLockContentsArray.slice(1)) {
        const yarnDependencyLines = yarnDependencyBlock
          .trim()
          .split(new RegExp(eolRegex));
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
      // We failed to get lock file contents either because file doesn't exist or it is not parse-able
      return { dependencies };
    }

    return { dependencies };
  };
}
