import {
  CloudFrontClient,
  DeleteDistributionCommand,
  DistributionList,
  DistributionSummary,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  ListDistributionsCommandOutput,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';

/**
 * Matches the S3 origin domain name formats CloudFront reports, for example
 * `bucket.s3.us-west-2.amazonaws.com`, `bucket.s3.amazonaws.com` and
 * `bucket.s3-website-us-west-2.amazonaws.com`. The first group is the bucket name.
 */
const S3_ORIGIN_DOMAIN_PATTERN =
  /^(.+?)\.s3(?:[.-]website)?(?:\.dualstack)?(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/;

const DEPLOYED_STATUS = 'Deployed';

/**
 * Outcome of an attempt to reap the distributions of a single bucket.
 *
 * `disable-requested` means at least one distribution still exists, therefore the origin
 * bucket must be retained. `deleted` means every distribution of the bucket is gone.
 */
export type DistributionReapResult = 'none' | 'disable-requested' | 'deleted';

/**
 * Deletes CloudFront distributions that are left behind by failed e2e test stack deletions.
 *
 * A distribution cannot be deleted while it is enabled, and disabling it takes tens of minutes
 * to propagate. Reaping is therefore a convergence across hourly runs of the cleanup job rather
 * than a single blocking operation: one run requests the disable, a later run performs the delete.
 */
export class CloudFrontDistributionCleaner {
  /**
   * Creates CloudFront distribution cleaner.
   */
  constructor(
    private readonly cloudFrontClient: CloudFrontClient,
    private readonly testResourcePrefix: string,
    private readonly log: (message: string) => void = console.log,
  ) {}

  /**
   * Indexes all distributions that use a test bucket as an origin by that bucket name.
   *
   * Returns an empty index if the distributions cannot be listed, so that the rest of the
   * cleanup keeps working in accounts where the cleanup role is not permitted to use CloudFront.
   */
  buildBucketToDistributionsIndex = async (): Promise<
    Map<string, Array<DistributionSummary>>
  > => {
    const index = new Map<string, Array<DistributionSummary>>();
    let marker: string | undefined = undefined;
    try {
      do {
        const listDistributionsResponse: ListDistributionsCommandOutput =
          await this.cloudFrontClient.send(
            new ListDistributionsCommand({ Marker: marker }),
          );
        const distributionList: DistributionList | undefined =
          listDistributionsResponse.DistributionList;
        for (const distribution of distributionList?.Items ?? []) {
          for (const bucketName of this.getTestBucketOrigins(distribution)) {
            const distributions = index.get(bucketName) ?? [];
            distributions.push(distribution);
            index.set(bucketName, distributions);
          }
        }
        marker =
          distributionList?.IsTruncated === true
            ? distributionList.NextMarker
            : undefined;
      } while (marker);
    } catch (error) {
      this.log(
        `Unable to list CloudFront distributions, skipping distribution cleanup. ${this.getErrorMessage(error)}`,
      );
      return new Map();
    }
    return index;
  };

  /**
   * Moves every distribution of the bucket one step closer to deletion.
   *
   * The caller must retain the bucket unless the result is `none` or `deleted`. Deleting the
   * origin bucket of a distribution that still exists turns it into a dangling distribution
   * that serves a bucket name anybody can claim.
   */
  reapDistributionsForBucket = async (
    bucketName: string,
    bucketToDistributions: Map<string, Array<DistributionSummary>>,
  ): Promise<DistributionReapResult> => {
    const distributions = bucketToDistributions.get(bucketName) ?? [];
    let result: DistributionReapResult = 'none';
    for (const distribution of distributions) {
      const distributionResult = await this.reapDistribution(distribution);
      if (distributionResult === 'disable-requested') {
        result = 'disable-requested';
      } else if (result === 'none') {
        result = distributionResult;
      }
    }
    return result;
  };

  private reapDistribution = async (
    distribution: DistributionSummary,
  ): Promise<DistributionReapResult> => {
    const distributionId = distribution.Id;
    if (!distributionId) {
      return 'none';
    }
    try {
      if (distribution.Enabled !== false) {
        await this.disableDistribution(distributionId);
        this.log(
          `Requested disable of ${distributionId} CloudFront distribution. It will be deleted by a subsequent run`,
        );
        return 'disable-requested';
      }
      if (distribution.Status !== DEPLOYED_STATUS) {
        this.log(
          `The ${distributionId} CloudFront distribution is disabled but not deployed yet. It will be deleted by a subsequent run`,
        );
        return 'disable-requested';
      }
      const getDistributionConfigResponse = await this.cloudFrontClient.send(
        new GetDistributionConfigCommand({ Id: distributionId }),
      );
      await this.cloudFrontClient.send(
        new DeleteDistributionCommand({
          Id: distributionId,
          IfMatch: getDistributionConfigResponse.ETag,
        }),
      );
      this.log(
        `Successfully deleted ${distributionId} CloudFront distribution`,
      );
      return 'deleted';
    } catch (error) {
      // The distribution is still there, so its origin bucket must be retained.
      this.log(
        `Failed to reap ${distributionId} CloudFront distribution. Retaining its origin bucket. ${this.getErrorMessage(error)}`,
      );
      return 'disable-requested';
    }
  };

  private disableDistribution = async (
    distributionId: string,
  ): Promise<void> => {
    const getDistributionConfigResponse = await this.cloudFrontClient.send(
      new GetDistributionConfigCommand({ Id: distributionId }),
    );
    if (
      !getDistributionConfigResponse.DistributionConfig ||
      !getDistributionConfigResponse.ETag
    ) {
      throw new Error(
        `Unable to read the configuration of ${distributionId} CloudFront distribution`,
      );
    }
    await this.cloudFrontClient.send(
      new UpdateDistributionCommand({
        Id: distributionId,
        IfMatch: getDistributionConfigResponse.ETag,
        DistributionConfig: {
          ...getDistributionConfigResponse.DistributionConfig,
          Enabled: false,
        },
      }),
    );
  };

  private getTestBucketOrigins = (
    distribution: DistributionSummary,
  ): Array<string> => {
    const bucketNames = new Set<string>();
    for (const origin of distribution.Origins?.Items ?? []) {
      const bucketName = origin.DomainName
        ? S3_ORIGIN_DOMAIN_PATTERN.exec(origin.DomainName)?.[1]
        : undefined;
      if (bucketName?.startsWith(this.testResourcePrefix)) {
        bucketNames.add(bucketName);
      }
    }
    return [...bucketNames];
  };

  private getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : '';
}
