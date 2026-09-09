import { execa } from 'execa';
import fs from 'fs';
import semver from 'semver';

let testPaths = process.argv.slice(2);

const nodeVersion = semver.parse(process.versions.node);
if (nodeVersion && nodeVersion.major >= 21) {
  // Starting from version 21. Node test runner's cli changed how inputs to test CLI work.
  // See https://github.com/nodejs/node/issues/50219.
  testPaths = testPaths.map((path) => {
    if (fs.existsSync(path) && fs.statSync(path).isDirectory()) {
      return `${path}/**/*.test.?(c|m)js`;
    }
    return path;
  });
}

await execa('tsx', ['--test', '--test-reporter', 'spec'].concat(testPaths), {
  stdio: 'inherit',
});
