import {
  Dependency,
  LockFileContents,
  LockFileReader,
} from '@aws-amplify/plugin-types';
import fsp from 'fs/promises';
import path from 'path';
import z from 'zod';
import { printer } from '../../printer.js';
import { LogLevel } from '../../printer/printer.js';

/**
 * NpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class NpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const dependencies: Array<Dependency> = [];
    const packageLockJsonPath = path.resolve(
      process.cwd(),
      'package-lock.json'
    );

    let jsonLockParsedValue: Record<string, unknown>;
    try {
      const jsonLockContents = await fsp.readFile(packageLockJsonPath, 'utf-8');
      jsonLockParsedValue = JSON.parse(jsonLockContents);
    } catch (error) {
      printer.log(
        `Failed to get lock file contents because ${packageLockJsonPath} does not exist or is not parse-able`,
        LogLevel.DEBUG
      );
      return { dependencies };
    }

    // This will strip fields that are not part of the package lock schema
    const packageLockJson = packageLockJsonSchema.parse(jsonLockParsedValue);

    for (const key in packageLockJson.packages) {
      if (key === '') {
        // Skip root project in packages
        continue;
      }
      // Remove "node_modules/" prefix
      const dependencyName = key.replace(/^node_modules\//, '');
      dependencies.push({
        name: dependencyName,
        version: packageLockJson.packages[key].version,
      });
    }

    return { dependencies };
  };
}

const packageLockJsonSchema = z.object({
  packages: z
    .record(
      z.string(),
      z.object({
        version: z.string(),
      })
    )
    .optional(),
});
