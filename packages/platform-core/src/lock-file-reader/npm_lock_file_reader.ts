import fsp from 'fs/promises';
import path from 'path';
import z from 'zod';
import { AmplifyUserError } from '../errors';
import {
  Dependencies,
  LockFileContents,
  LockFileReader,
} from './lock_file_reader_factory';

/**
 * NpmLockFileReader is an abstraction around the logic used to read and parse lock file contents
 */
export class NpmLockFileReader implements LockFileReader {
  getLockFileContentsFromCwd = async (): Promise<LockFileContents> => {
    const packageLockJsonPath = path.resolve(
      process.cwd(),
      'package-lock.json'
    );

    try {
      await fsp.access(packageLockJsonPath);
    } catch (error) {
      throw new AmplifyUserError('InvalidPackageLockJsonError', {
        message: `Could not find a package-lock.json file at ${packageLockJsonPath}`,
        resolution: `Ensure that ${packageLockJsonPath} exists and is a valid JSON file`,
      });
    }

    let jsonLockParsedValue: Record<string, unknown>;
    try {
      const jsonLockContents = await fsp.readFile(packageLockJsonPath, 'utf-8');
      jsonLockParsedValue = JSON.parse(jsonLockContents);
    } catch (error) {
      throw new AmplifyUserError(
        'InvalidPackageLockJsonError',
        {
          message: `Could not parse the contents of ${packageLockJsonPath}`,
          resolution: `Ensure that ${packageLockJsonPath} exists and is a valid JSON file`,
        },
        error as Error
      );
    }

    // This will strip fields that are not part of the package lock schema
    const packageLockJson = packageLockJsonSchema.parse(jsonLockParsedValue);

    const dependencies: Dependencies = [];

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
