import { glob } from 'glob';
import * as path from 'path';
import semver from 'semver';

let result = await glob('packages/*');
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  path.join('packages', 'integration-tests', 'lib', 'test-in-memory')
);

const nodeVersion = semver.parse(process.versions.node);
if (nodeVersion && nodeVersion.major >= 21) {
  // Starting from version 21. Node test runner's cli changed how search pattern works.
  // See https://github.com/nodejs/node/issues/50219.
  result = result.map((p) => `${p}/**/*.test.?(c|m)js`);
}

console.log(result.join(' '));
