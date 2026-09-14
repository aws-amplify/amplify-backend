import { Dependency } from '@aws-amplify/plugin-types';
import fsp from 'fs/promises';
import path from 'path';
import z from 'zod';
import { LockFileContents, LockFileReader } from './types.js';
import { printer } from '../../printer.js';
import { LogLevel } from '../../printer/printer.js';

/**
 * NpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class NpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<
    LockFileContents | undefined
  > => {
    const dependencies: Array<Dependency> = [];
    const packageLockJsonPath = path.resolve(
      process.cwd(),
      'package-lock.json',
    );
    let packageLockJson;
    try {
      const jsonLockContents = await fsp.readFile(packageLockJsonPath, 'utf-8');
      const jsonLockParsedValue = JSON.parse(jsonLockContents);
      // This will strip fields that are not part of the package lock schema
      packageLockJson = packageLockJsonSchema.parse(jsonLockParsedValue);
    } catch {
      printer.log(
        `Failed to get lock file contents because ${packageLockJsonPath} does not exist or is not parse-able`,
        LogLevel.DEBUG,
      );
      return;
    }

    for (const key in packageLockJson.packages) {
      if (key === '') {
        // Skip root project in packages
        continue;
      }
      const dependencyVersion = packageLockJson.packages[key].version;

      // Version may not exist if package is a symbolic link
      if (dependencyVersion) {
        // Remove "node_modules/" prefix
        const dependencyName = key.replace(/^node_modules\//, '');
        dependencies.push({
          name: dependencyName,
          version: dependencyVersion,
        });
      }
    }

    return { dependencies };
  };
}

const packageLockJsonSchema = z.object({
  packages: z
    .record(
      z.string(),
      z.object({
        version: z.string().optional(),
      }),
    )
    .optional(),
});
