import { glob } from 'glob';
import { readPackageJson } from './components/package-json/package_json.js';

const packagePaths = await glob('./packages/*');

for (const packagePath of packagePaths) {
  const { main, name, isPrivate } = await readPackageJson(packagePath);
  if (isPrivate || name === '@aws-amplify/integration-tests') {
    continue;
  }
  if (!main) {
    throw new Error(
      `Expected package ${name} to have field main, but main is missing.`
    );
  }
}
