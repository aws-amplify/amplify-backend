import { Dependency } from '@aws-amplify/plugin-types';
import fsp from 'fs/promises';
import path from 'path';
import { LockFileContents, LockFileReader } from './types.js';
import { printer } from '../../printer.js';
import { LogLevel } from '../../printer/printer.js';

/**
 * YarnModernLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class YarnModernLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<
    LockFileContents | undefined
  > => {
    const eolRegex = '[\r\n]';
    const dependencies: Array<Dependency> = [];
    const yarnLockPath = path.resolve(process.cwd(), 'yarn.lock');

    try {
      const yarnLockContents = await fsp.readFile(yarnLockPath, 'utf-8');
      const yarnLockContentsArray = yarnLockContents.split(
        new RegExp(`${eolRegex}${eolRegex}`),
      );

      if (yarnLockContentsArray.length === 3) {
        // Contents are only comment block, metadata, and workspace info
        return { dependencies };
      }

      // Slice to remove comment block and metadata at the start of the lock file
      for (const yarnDependencyBlock of yarnLockContentsArray.slice(2)) {
        const yarnDependencyLines = yarnDependencyBlock
          .trim()
          .split(new RegExp(eolRegex));
        const yarnDependencyName = yarnDependencyLines[0];
        const yarnDependencyVersion = yarnDependencyLines[1];

        // Get dependency name before versioning info
        const dependencyName = yarnDependencyName
          .slice(0, yarnDependencyName.lastIndexOf('@'))
          .replaceAll(/"/g, '');
        const versionMatch = yarnDependencyVersion.match(/[\d.]+/);
        const dependencyVersion = versionMatch ? versionMatch[0] : '';

        dependencies.push({ name: dependencyName, version: dependencyVersion });
      }
    } catch {
      printer.log(
        `Failed to get lock file contents because ${yarnLockPath} does not exist or is not parse-able`,
        LogLevel.DEBUG,
      );
      return;
    }

    return { dependencies };
  };
}
