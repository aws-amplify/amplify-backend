import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SparseTestMatrixGenerator } from './sparse_test_matrix_generator.js';
import { fileURLToPath } from 'url';

void describe('Sparse matrix generator', () => {
  void it('generates sparse matrix', async () => {
    const testDirectory = fileURLToPath(
      new URL('./test-resources/sparse-generator-test-stubs', import.meta.url)
    );
    const matrix = await new SparseTestMatrixGenerator({
      testGlobPattern: `${testDirectory}/*.test.ts`,
      dimensions: {
        dimension1: ['dim1val1', 'dim1val2', 'dim1,val3'],
        dimension2: ['dim2val1', 'dim2val2'],
      },
      maxTestsPerJob: 2,
    }).generate();

    assert.deepStrictEqual(matrix, {
      include: [
        {
          displayNames: 'test3.test.ts test2.test.ts',
          dimension1: 'dim1val1',
          dimension2: 'dim2val1',
          testPaths: `${testDirectory}/test3.test.ts ${testDirectory}/test2.test.ts`,
        },
        {
          displayNames: 'test3.test.ts test2.test.ts',
          dimension1: 'dim1val2',
          dimension2: 'dim2val2',
          testPaths: `${testDirectory}/test3.test.ts ${testDirectory}/test2.test.ts`,
        },
        {
          displayNames: 'test3.test.ts test2.test.ts',
          dimension1: 'dim1,val3',
          dimension2: 'dim2val1',
          testPaths: `${testDirectory}/test3.test.ts ${testDirectory}/test2.test.ts`,
        },
        {
          displayNames: 'test1.test.ts',
          dimension1: 'dim1val1',
          dimension2: 'dim2val1',
          testPaths: `${testDirectory}/test1.test.ts`,
        },
        {
          displayNames: 'test1.test.ts',
          dimension1: 'dim1val2',
          dimension2: 'dim2val2',
          testPaths: `${testDirectory}/test1.test.ts`,
        },
        {
          displayNames: 'test1.test.ts',
          dimension1: 'dim1,val3',
          dimension2: 'dim2val1',
          testPaths: `${testDirectory}/test1.test.ts`,
        },
      ],
    });
  });
});
