import { glob } from 'glob';
import path from 'path';

// See https://docs.github.com/en/actions/writing-workflows/choosing-what-your-workflow-does/running-variations-of-jobs-in-a-workflow
type JobMatrix = {
  include?: Array<Record<string, string>>;
} & Record<string, string>;

export type SparseTestMatrixGeneratorProps = {
  testGlobPattern: string;
  maxTestsPerJob: number;
  dimensions: Record<string, Array<string>>;
};

/**
 * Generates a sparse test matrix.
 *
 * Sparse matrix is created is such a way that:
 * 1. Every test is included
 * 2. Every dimension's value is included
 * 3. Algorithm avoids cartesian product of dimensions, just minimal subset that uses all values.
 */
export class SparseTestMatrixGenerator {
  /**
   * Creates sparse test matrix generator.
   */
  constructor(private readonly props: SparseTestMatrixGeneratorProps) {
    if (Object.keys(props.dimensions).length === 0) {
      throw new Error('At least one dimension is required');
    }
  }

  generate = async (): Promise<JobMatrix> => {
    const testPaths = await glob(this.props.testGlobPattern);

    const matrix: JobMatrix = {};
    matrix.include = [];

    for (const testPathsBatch of this.chunkArray(
      testPaths,
      this.props.maxTestsPerJob
    )) {
      const dimensionsIndexes: Record<string, number> = {};
      const dimensionCoverageComplete: Record<string, boolean> = {};

      Object.keys(this.props.dimensions).forEach((key) => {
        dimensionsIndexes[key] = 0;
        dimensionCoverageComplete[key] = false;
      });

      let allDimensionsComplete = false;

      do {
        const matrixEntry: Record<string, string> = {};
        matrixEntry.displayNames = testPathsBatch
          .map((testPath) => path.basename(testPath))
          .join(' ');
        Object.keys(this.props.dimensions).forEach((key) => {
          matrixEntry[key] = this.props.dimensions[key][dimensionsIndexes[key]];
        });
        matrixEntry.testPaths = testPathsBatch.join(' ');
        matrix.include?.push(matrixEntry);

        Object.keys(this.props.dimensions).forEach((key) => {
          dimensionsIndexes[key]++;
          if (dimensionsIndexes[key] === this.props.dimensions[key].length) {
            // mark dimension as complete and start the cycle from start until all dimensions are used.
            dimensionCoverageComplete[key] = true;
            dimensionsIndexes[key] = 0;
          }
        });

        // check if all dimensions are processed.
        allDimensionsComplete = Object.keys(this.props.dimensions).reduce(
          (acc, key) => {
            return acc && dimensionCoverageComplete[key];
          },
          true
        );
      } while (!allDimensionsComplete);
    }

    return matrix;
  };

  private chunkArray = <T>(array: Array<T>, chunkSize: number) => {
    const result: Array<Array<T>> = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      result.push(array.slice(i, i + chunkSize));
    }
    return result;
  };
}
