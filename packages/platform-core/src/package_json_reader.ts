import fs from 'fs';
import path from 'path';
import z from 'zod';
import { AmplifyUserError } from './errors';

/**
 * return the package json
 */
export class PackageJsonReader {
  read = (absolutePackageJsonPath: string): PackageJson => {
    if (!fs.existsSync(absolutePackageJsonPath)) {
      throw new AmplifyUserError('InvalidPackageJsonError', {
        message: `Could not find a package.json file at ${absolutePackageJsonPath}`,
        resolution: `Ensure that ${absolutePackageJsonPath} exists and is a valid JSON file`,
      });
    }
    let jsonParsedValue: Record<string, unknown>;
    try {
      jsonParsedValue = JSON.parse(
        // we have to use sync fs methods here because this is also used during cdk synth
        fs.readFileSync(absolutePackageJsonPath, 'utf-8')
      );
    } catch (err) {
      throw new AmplifyUserError(
        'InvalidPackageJsonError',
        {
          message: `Could not parse the contents of ${absolutePackageJsonPath}`,
          resolution: `Ensure that ${absolutePackageJsonPath} exists and is a valid JSON file`,
        },
        err as Error
      );
    }
    return packageJsonSchema.parse(jsonParsedValue);
  };

  /**
   * Returns the contents of the package.json file in process.cwd()
   *
   * If no package.json file exists, or the content does not pass validation, an error is thrown
   */
  readFromCwd = (): PackageJson => {
    return this.read(path.resolve(process.cwd(), 'package.json'));
  };
}

/**
 * Type for package.json content.
 *
 * Add additional validation if there are other fields we need to read
 */
export const packageJsonSchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  type: z.union([z.literal('module'), z.literal('commonjs')]).optional(),
});

export type PackageJson = z.infer<typeof packageJsonSchema>;
