import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';

/**
 * Walks up the local directory tree starting from startPath looking for a package.json file
 * Once found, it returns the JSON.parsed contents of the file
 *
 * If it reaches the root of the directory without finding a package.json and error is thrown
 */
export const fetchNearestPackageJson = async (
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
  return JSON.parse(await fsp.readFile(tryPath, 'utf-8'));
};

const isPathAtRoot = (testPath: string) => {
  const pathParts = path.parse(testPath);
  return pathParts.root === pathParts.dir;
};
