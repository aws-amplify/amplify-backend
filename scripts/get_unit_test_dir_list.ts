import { glob } from 'glob';
import * as path from 'path';
import semver from 'semver';

let result = await glob('packages/*');
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  path.join('packages', 'integration-tests', 'lib', 'test-in-memory')
);

const nodeVersion = semver.parse(process.versions.node);
if (nodeVersion && nodeVersion.major >= 22) {
  // Starting from version 22. Node test runner's cli changed how search pattern works.
  // It would try to load paths as modules if "**/*.test.js" search pattern is omitted.
  result = result.map((path) => `${path}/**/*.test.js`);
}

console.log(result.join(' '));
