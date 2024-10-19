import { glob } from 'glob';

// See https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow
type JobMatrix = {
  include?: Array<Record<string, string>>;
} & Record<string, string>;

// This script generates a sparse test matrix.
// Every test must run on each type of OS and each version of node.
// However, we don't have to run every combination.

if (process.argv.length < 4) {
  console.log(
    'Usage: npx tsx scripts/generate_sparse_test_matrix.ts <directory> <test-glob-pattern> <max-tests-per-job?>'
  );
}

const directory = process.argv[2];
const testGlobPattern = process.argv[3];
const maxTestsPerJob = process.argv[4] ? parseInt(process.argv[4]) : 2;

const tests = await glob(testGlobPattern, {
  cwd: directory,
});

const matrix: JobMatrix = {};
matrix.include = [];

// eslint-disable-next-line spellcheck/spell-checker
const osKinds = ['ubuntu-latest', 'macos-14-xlarge', 'windows-latest'];
const nodeVersions = ['18', '20'];

const chunks = <T>(array: Array<T>, chunkSize: number) => {
  const result: Array<Array<T>> = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    result.push(array.slice(i, i + chunkSize));
  }
  return result;
};

for (const testBatch of chunks(tests, maxTestsPerJob)) {
  let allOsCovered = false;
  let allNodeVersionsCovered = false;
  let osIndex = 0;
  let nodeVersionIndex = 0;

  do {
    matrix.include?.push({
      tests: testBatch.join(' '),
      'node-version': nodeVersions[nodeVersionIndex],
      os: osKinds[osIndex],
      testPaths: testBatch.map((test) => `${directory}/${test}`).join(' '),
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
