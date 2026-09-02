import { S3BucketEmptier } from './s3_bucket_emptier.js';
import {
  BucketToDistributionsIndex,
  CloudFrontDistributionCleaner,
} from './cloudfront_distribution_cleaner.js';

/**
 * The buckets a sweep deleted and the buckets it deliberately retained.
 */
export type StaleBucketSweepResult = {
  deletedBucketNames: Array<string>;
  retainedBucketNames: Array<string>;
};

/**
 * Deletes the stale e2e test buckets that no live stack and no CloudFront distribution still uses.
 *
 * The sweep is fail closed: a bucket is only deleted once it is proven to be free of both a live
 * stack owner and a distribution origin usage. Retaining a bucket costs a little storage until a
 * later run deletes it, whereas deleting the origin bucket of a distribution that still exists
 * leaves a dangling distribution that serves a bucket name anybody can claim.
 */
export class StaleBucketSweeper {
  /**
   * Creates stale bucket sweeper.
   */
  constructor(
    private readonly s3BucketEmptier: S3BucketEmptier,
    private readonly cloudFrontDistributionCleaner: CloudFrontDistributionCleaner,
    private readonly isOwnedByLiveStack: (bucketName: string) => boolean,
    private readonly log: (message: string) => void = console.log,
    private readonly signalIncompleteRun: () => void = () => {
      process.exitCode = 1;
    },
  ) {}

  /**
   * Deletes the buckets of `bucketNames` that are provably unused.
   *
   * Every bucket is retained when the distribution index is incomplete, because an incomplete
   * index makes every bucket look origin free. The run is then marked as failed so that it is
   * retried and the cause of the incomplete index is visible.
   */
  sweep = async (
    bucketNames: Array<string>,
    bucketToDistributions: BucketToDistributionsIndex,
  ): Promise<StaleBucketSweepResult> => {
    if (!bucketToDistributions.isComplete) {
      this.log(
        `Retaining all ${bucketNames.length} stale buckets of this run. The CloudFront distribution index is incomplete, so no bucket can be told apart from the origin bucket of a distribution that still exists. Failing the job so that the run is retried and the cause is visible`,
      );
      this.signalIncompleteRun();
      return {
        deletedBucketNames: [],
        retainedBucketNames: [...bucketNames],
      };
    }
    const result: StaleBucketSweepResult = {
      deletedBucketNames: [],
      retainedBucketNames: [],
    };
    for (const bucketName of bucketNames) {
      if (this.isOwnedByLiveStack(bucketName)) {
        result.retainedBucketNames.push(bucketName);
        continue;
      }
      try {
        /**
         * Deleting the origin bucket of a distribution that still exists leaves a distribution
         * that serves a bucket name anybody can claim, so the distributions go first. Disabling a
         * distribution takes tens of minutes to propagate, therefore the bucket is retained until
         * a subsequent run of this script is able to delete its distributions.
         */
        const distributionReapResult =
          await this.cloudFrontDistributionCleaner.reapDistributionsForBucket(
            bucketName,
            bucketToDistributions,
          );
        if (
          distributionReapResult === 'disable-requested' ||
          distributionReapResult === 'index-incomplete'
        ) {
          this.log(
            `Retaining ${bucketName} bucket. A CloudFront distribution still uses it as an origin`,
          );
          result.retainedBucketNames.push(bucketName);
          continue;
        }
        await this.s3BucketEmptier.emptyAndDelete(bucketName);
        this.log(`Successfully deleted ${bucketName} bucket`);
        result.deletedBucketNames.push(bucketName);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '';
        this.log(`Failed to delete ${bucketName} bucket. ${errorMessage}`);
        result.retainedBucketNames.push(bucketName);
      }
    }
    return result;
  };
}
