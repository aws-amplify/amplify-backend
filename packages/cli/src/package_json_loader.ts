import * as _fs from 'fs';
import * as _fsp from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

export type PackageJsonLoader = {
  loadPackageJson: (dir?: string) => Promise<PackageJson>;
};

/**
 * Loads the contents of package.json from process.cwd().
 *
 * Throws if no package.json is present
 */
export class PackageJsonFileLoader implements PackageJsonLoader {
  /**
   * Pass in fs references so that they can be mocked in tests
   */
  constructor(private readonly fs = _fs, private readonly fsp = _fsp) {}

  /**
   * Returns the contents of the package.json file in the specified absolute dir path
   *
   * If no dir is provided, it defaults to process.cwd()
   *
   * If no package.json file exists, or the content does not pass validation, an error is thrown
   */
  loadPackageJson = async (dir = process.cwd()): Promise<PackageJson> => {
    const tryPath = path.resolve(dir, 'package.json');
    if (!this.fs.existsSync(tryPath)) {
      throw new Error(`Could not find a package.json file at ${tryPath}`);
    }
    const fileContent = await this.fsp.readFile(tryPath, 'utf-8');
    let jsonParsedValue: Record<string, unknown>;
    try {
      jsonParsedValue = JSON.parse(fileContent);
    } catch (err) {
      throw new Error(`Could not JSON.parse the contents of ${tryPath}`);
    }
    return packageJsonSchema.parse(jsonParsedValue);
  };
}

/**
 * Type for package.json content.
 *
 * Add additional validation if there are other fields we need to read
 */
const packageJsonSchema = z.object({
  name: z.string(),
  version: z.string(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;
