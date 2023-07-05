import * as fs from 'fs-extra';
import * as path from 'path';
import * as util from 'util';
import { readFile, writeFile } from 'fs/promises';

/**
 * Copies the specified template directory to a new package directory
 */
const { values } = util.parseArgs({
  options: {
    template: {
      type: 'string',
    },
    name: {
      type: 'string',
    },
  },
});

if (!values?.name || !values?.template) {
  throw new Error(
    'Specify a package template using --template=<string> and a new package name using --name=<string>. Valid template names are the directory names under ./templates'
  );
}

const sourcePath = path.resolve(
  new URL('.', import.meta.url).pathname,
  '..',
  'templates',
  values.template as string
);
const destPath = path.resolve(
  new URL('.', import.meta.url).pathname,
  '..',
  'packages',
  values.name as string
);

await fs.copy(sourcePath, destPath);

// substitute in the library name into the new package.json file
const packageJsonPath = path.resolve(destPath, 'package.json');
const tokenizedPackageJson = await readFile(packageJsonPath, 'utf-8');
const newPackageJson = tokenizedPackageJson.replaceAll(
  '{{libName}}',
  values.name as string
);
await writeFile(packageJsonPath, newPackageJson);
