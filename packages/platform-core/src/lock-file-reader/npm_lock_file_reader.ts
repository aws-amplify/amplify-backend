import fsp from 'fs/promises';
import path from 'path';
import z from 'zod';
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
    const dependencies: Dependencies = [];
    const packageLockJsonPath = path.resolve(
      process.cwd(),
      'package-lock.json'
    );

    let jsonLockParsedValue: Record<string, unknown>;
    try {
      const jsonLockContents = await fsp.readFile(packageLockJsonPath, 'utf-8');
      jsonLockParsedValue = JSON.parse(jsonLockContents);
    } catch (error) {
      // We failed to get lock file contents either because file doesn't exist or it is not parse-able
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
