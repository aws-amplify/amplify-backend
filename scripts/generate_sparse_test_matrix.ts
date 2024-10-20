import { SparseTestMatrixGenerator } from './components/sparse_test_matrix_generator.js';

// This script generates a sparse test matrix.
// Every test must run on each type of OS and each version of node.
// However, we don't have to run every combination.

if (process.argv.length < 3) {
  console.log(
    "Usage: npx tsx scripts/generate_sparse_test_matrix.ts '<test-glob-pattern>' <max-tests-per-job?>"
  );
}

const testGlobPattern = process.argv[2];
const maxTestsPerJob = process.argv[3] ? parseInt(process.argv[3]) : 2;

if (!Number.isInteger(maxTestsPerJob)) {
  throw new Error(
    'Invalid max tests per job. If you are using glob pattern with starts in bash put it in quotes'
  );
}

const matrix = await new SparseTestMatrixGenerator({
  testGlobPattern,
  maxTestsPerJob,
  dimensions: {
    'node-version': ['18', '20'],
    os: ['ubuntu-latest', 'macos-14-xlarge', 'windows-latest'],
  },
}).generate();

console.log(JSON.stringify(matrix));
