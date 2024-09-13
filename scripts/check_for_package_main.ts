import { glob } from 'glob';
import { readPackageJson } from './components/package-json/package_json.js';

const packagePaths = await glob('./packages/*');

const errors: string[] = [];
for (const packagePath of packagePaths) {
  const { main, name, isPrivate } = await readPackageJson(packagePath);
  if (isPrivate || name === '@aws-amplify/integration-tests') {
    continue;
  }
  if (!main) {
    errors.push(
      `Expected package ${name} to have field main, but main is missing.`
    );
  }
}
if (errors.length > 0) {
  const errorMessagePrefix =
    'Packages were found to be missing main fields.\nAdd main field to package.json of the following packages:';
  throw new Error(`${errorMessagePrefix}\n ${errors.join('\n ')}`);
}
