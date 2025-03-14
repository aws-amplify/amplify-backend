import { SparseTestMatrixGenerator } from './components/sparse_test_matrix_generator.js';

// This script generates a sparse test matrix.
// Every test must run on each type of OS and each version of node.
// However, we don't have to run every combination.

if (process.argv.length < 5) {
  console.log(
    "Usage: npx tsx scripts/generate_sparse_test_matrix.ts '<test-glob-pattern>' '<node-versions-as-json-array>' '<os-as-json-array>' <max-tests-per-job?>",
  );
}

const testGlobPattern = process.argv[2];
const nodeVersions = JSON.parse(process.argv[3]) as Array<string>;
let os = JSON.parse(process.argv[4]) as Array<string>;
const maxTestsPerJob = process.argv[5] ? parseInt(process.argv[5]) : 2;

if (!Number.isInteger(maxTestsPerJob)) {
  throw new Error(
    'Invalid max tests per job. If you are using glob pattern with starts in bash put it in quotes',
  );
}

os = os.map((entry) => {
  if (entry === 'macos-14') {
    // replace with large.
    return 'macos-14-xlarge';
  }
  return entry;
});

const matrix = await new SparseTestMatrixGenerator({
  testGlobPattern,
  maxTestsPerJob,
  dimensions: {
    'node-version': nodeVersions,
    os,
  },
}).generate();

console.log(JSON.stringify(matrix));
