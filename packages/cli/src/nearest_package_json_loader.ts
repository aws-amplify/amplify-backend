import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

/**
 * Walks up the local directory tree starting from startPath looking for a package.json file
 * Once found, it returns the JSON.parsed contents of the file
 *
 * If it reaches the root of the directory without finding a package.json, an error is thrown.
 * If the file content cannot be parsed by JSON.parse, an error is thrown.
 * If the file content does not parse to an object, an error is thrown.
 *
 * No additional validation on the properties of the package.json object are made
 */
export const loadNearestPackageJson = async (
  startPath = process.cwd()
): Promise<Record<string, unknown>> => {
  let relativePath = path.join('.', 'package.json');
  let tryPath = path.resolve(startPath, relativePath);
  while (!fs.existsSync(tryPath) && !isPathAtRoot(tryPath)) {
    relativePath = path.join('..', relativePath);
    tryPath = path.resolve(startPath, path.join('..', relativePath));
  }
  if (!fs.existsSync(tryPath)) {
    throw new Error(
      `Could not find a package.json file in ${startPath} or any parent directory`
    );
  }
  const fileContent = await fsp.readFile(tryPath, 'utf-8');
  let parsedValue: Record<string, unknown>;
  try {
    parsedValue = JSON.parse(fileContent);
  } catch (err) {
    throw new Error(`Could not JSON.parse the contents of ${tryPath}`);
  }
  if (typeof parsedValue !== 'object') {
    throw new Error(`The contents of ${tryPath} did not parse to an object`);
  }
  return parsedValue;
};

const isPathAtRoot = (testPath: string) => {
  const pathParts = path.parse(testPath);
  return pathParts.root === pathParts.dir;
};
