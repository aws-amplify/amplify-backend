import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import { z } from 'zod';

/**
 * Returns the contents of the package.json file in process.cwd()
 *
 * If no package.json file exists, or the content does not pass validation, an error is thrown
 */
export const loadCwdPackageJson = async (): Promise<PackageJson> => {
  const tryPath = path.resolve(process.cwd(), 'package.json');
  if (!fs.existsSync(tryPath)) {
    throw new Error(`Could not find a package.json file at ${tryPath}`);
  }
  const fileContent = await fsp.readFile(tryPath, 'utf-8');
  let jsonParsedValue: Record<string, unknown>;
  try {
    jsonParsedValue = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(`Could not JSON.parse the contents of ${tryPath}`);
  }
  return packageJsonSchema.parse(jsonParsedValue);
};

/**
 * Type for package.json content.
 *
 * Add additional validation if there are other fields we need to read
 */
const packageJsonSchema = z.object({
  name: z.string(),
});

type PackageJson = z.infer<typeof packageJsonSchema>;
