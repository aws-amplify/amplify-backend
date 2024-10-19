import { glob } from 'glob';

// See https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow
type JobMatrix = {
  include?: Array<Record<string, string>>;
} & Record<string, string>;

// This script generates a sparse test matrix.
// Every test must run on each type of OS and each version of node.
// However, we don't have to run every combination.

if (process.argv.length !== 4) {
  console.log(
    'Usage: npx tsx scripts/generate_sparse_test_matrix.ts <directory> <test-glob-pattern>'
  );
}

const directory = process.argv[2];
const testGlobPattern = process.argv[3];

const tests = await glob(testGlobPattern, {
  cwd: directory,
});

const matrix: JobMatrix = {};
matrix.include = [];

// eslint-disable-next-line spellcheck/spell-checker
const osKinds = ['ubuntu-latest', 'macos-14-xlarge', 'windows-latest'];
const nodeVersions = ['18', '20'];

for (const test of tests) {
  let allOsCovered = false;
  let allNodeVersionsCovered = false;
  let osIndex = 0;
  let nodeVersionIndex = 0;

  do {
    matrix.include?.push({
      test,
      directory,
      os: osKinds[osIndex],
      'node-version': nodeVersions[nodeVersionIndex],
    });

    osIndex++;
    nodeVersionIndex++;
    if (osIndex === osKinds.length) {
      osIndex = 0;
      allOsCovered = true;
    }
    if (nodeVersionIndex === nodeVersions.length) {
      nodeVersionIndex = 0;
      allNodeVersionsCovered = true;
    }
  } while (!allOsCovered || !allNodeVersionsCovered);
}

console.log(JSON.stringify(matrix));
