import { SparseTestMatrixGenerator } from './components/sparse_test_matrix_generator.js';

// This script generates a sparse test matrix.
// Every test must run on each type of OS and each version of node.
// However, we don't have to run every combination.

if (process.argv.length < 4) {
  console.log(
    'Usage: npx tsx scripts/generate_sparse_test_matrix.ts <directory> <test-glob-pattern> <max-tests-per-job?>'
  );
}

const testDirectory = process.argv[2];
const testGlobPattern = process.argv[3];
const maxTestsPerJob = process.argv[4] ? parseInt(process.argv[4]) : 2;

const matrix = await new SparseTestMatrixGenerator({
  testDirectory,
  testGlobPattern,
  maxTestsPerJob,
  dimensions: {
    'node-version': ['18', '20'],
    os: ['ubuntu-latest', 'macos-14-xlarge', 'windows-latest'],
  },
}).generate();

console.log(JSON.stringify(matrix));
