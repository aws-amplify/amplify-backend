import {
  CloudFrontClient,
  DeleteDistributionCommand,
  DistributionList,
  DistributionSummary,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  ListDistributionsCommandOutput,
  Origin,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';

/**
 * Matches the virtual hosted style S3 origin domain names CloudFront reports, for example
 * `bucket.s3.us-west-2.amazonaws.com`, `bucket.s3.amazonaws.com`,
 * `bucket.s3-website-us-west-2.amazonaws.com`, `bucket.s3.dualstack.us-west-2.amazonaws.com`
 * and the China partition form `bucket.s3.cn-north-1.amazonaws.com.cn`. The first group is the
 * bucket name.
 */
const S3_VIRTUAL_HOSTED_ORIGIN_DOMAIN_PATTERN =
  /^(.+?)\.s3(?:[.-]website)?(?:[.-]fips)?(?:\.dualstack)?(?:[.-][a-z0-9-]+)?\.amazonaws\.com(?:\.[a-z]{2})?$/;

/**
 * Matches the legacy path style S3 origin hosts, where the host carries no bucket name at all and
 * the bucket is the leading segment of the path, for example `s3.amazonaws.com` or
 * `s3.us-west-2.amazonaws.com` with a `/bucket` path. The path is taken from the domain name when
 * it carries one and from the origin path otherwise.
 */
const S3_PATH_STYLE_ORIGIN_HOST_PATTERN =
  /^s3(?:[.-]website)?(?:[.-]fips)?(?:\.dualstack)?(?:[.-][a-z0-9-]+)?\.amazonaws\.com(?:\.[a-z]{2})?$/;

const DEPLOYED_STATUS = 'Deployed';

type OriginBucketNameResult =
  | { kind: 'matched'; bucket: string }
  | { kind: 'not-s3' }
  | { kind: 'unrecognized-s3' };

/**
 * Outcome of an attempt to reap the distributions of a single bucket.
 *
 * `disable-requested` means at least one distribution still exists, therefore the origin bucket
 * must be retained. `unreapable` means a distribution cannot be managed safely and the run must
 * fail. `index-incomplete` means the distributions of the bucket are unknown, therefore the origin
 * bucket must be retained as well. `deleted` means every distribution of the bucket is gone.
 */
export type DistributionReapResult =
  | 'none'
  | 'index-incomplete'
  | 'unreapable'
  | 'disable-requested'
  | 'deleted';

/**
 * Index of the CloudFront distributions that use each test bucket as an origin.
 *
 * `isComplete` is false when the distributions could not be listed. A caller must not delete any
 * bucket while the index is incomplete: an incomplete index makes every bucket look origin free,
 * so deleting buckets would leave dangling distributions behind that serve a bucket name anybody
 * can claim. Retaining the buckets instead is always safe because a later healthy run deletes them.
 */
export class BucketToDistributionsIndex {
  /**
   * Creates an index of distributions by the name of the test bucket they use as an origin.
   */
  constructor(
    private readonly distributionsByBucketName: Map<
      string,
      Array<DistributionSummary>
    >,
    readonly isComplete: boolean,
    readonly incompleteReason?: string,
  ) {}

  /**
   * Returns the distributions that use the bucket as an origin, or an empty list if none do.
   */
  getDistributions = (bucketName: string): Array<DistributionSummary> =>
    this.distributionsByBucketName.get(bucketName) ?? [];

  /**
   * Returns the names of the test buckets that are used as a distribution origin.
   */
  getBucketNames = (): Array<string> => [
    ...this.distributionsByBucketName.keys(),
  ];
}

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
   * Returns an index marked as incomplete if the distributions cannot be listed, for example in
   * accounts where the cleanup role is not permitted to use CloudFront or when the CloudFront API
   * throttles. The caller must then retain every bucket instead of deleting origin buckets on the
   * strength of an index that knows about no distribution at all.
   */
  buildBucketToDistributionsIndex =
    async (): Promise<BucketToDistributionsIndex> => {
      const distributionsByBucketName = new Map<
        string,
        Array<DistributionSummary>
      >();
      let marker: string | undefined = undefined;
      const seenMarkers = new Set<string>();
      try {
        do {
          const listDistributionsResponse: ListDistributionsCommandOutput =
            await this.cloudFrontClient.send(
              new ListDistributionsCommand({ Marker: marker }),
            );
          const distributionList: DistributionList | undefined =
            listDistributionsResponse.DistributionList;
          for (const distribution of distributionList?.Items ?? []) {
            const { bucketNames, hasUnrecognizedS3Origin } =
              this.getTestBucketOrigins(distribution);
            if (hasUnrecognizedS3Origin) {
              this.log(
                `CloudFront distribution ${distribution.Id ?? '<unknown>'} has an unrecognized S3 origin. Stale buckets must be retained because the origin bucket cannot be identified`,
              );
              return new BucketToDistributionsIndex(
                distributionsByBucketName,
                false,
                `unrecognized-s3-origin: distribution ${distribution.Id ?? '<unknown>'}`,
              );
            }
            for (const bucketName of bucketNames) {
              const distributions =
                distributionsByBucketName.get(bucketName) ?? [];
              distributions.push(distribution);
              distributionsByBucketName.set(bucketName, distributions);
            }
          }
          if (distributionList?.IsTruncated === true) {
            const nextMarker = distributionList.NextMarker;
            if (!nextMarker || seenMarkers.has(nextMarker)) {
              this.log(
                `CloudFront distribution pagination did not provide a new marker. Stale buckets must be retained because the distribution index is incomplete`,
              );
              return new BucketToDistributionsIndex(
                distributionsByBucketName,
                false,
                `invalid-pagination: marker ${marker ?? '<initial>'}`,
              );
            }
            seenMarkers.add(nextMarker);
            marker = nextMarker;
          } else {
            marker = undefined;
          }
        } while (marker);
      } catch (error) {
        const errorMessage = this.getErrorMessage(error);
        this.log(
          `Unable to list CloudFront distributions. Stale buckets must be retained by this run because their origin usage is unknown. ${errorMessage}`,
        );
        return new BucketToDistributionsIndex(
          distributionsByBucketName,
          false,
          `list-distributions-error: ${errorMessage || 'unknown error'}`,
        );
      }
      return new BucketToDistributionsIndex(distributionsByBucketName, true);
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
    bucketToDistributions: BucketToDistributionsIndex,
  ): Promise<DistributionReapResult> => {
    if (!bucketToDistributions.isComplete) {
      // The distributions of the bucket are unknown, so the bucket cannot be proven origin free.
      return 'index-incomplete';
    }
    const distributions = bucketToDistributions.getDistributions(bucketName);
    let result: DistributionReapResult = 'none';
    for (const distribution of distributions) {
      const distributionResult = await this.reapDistribution(distribution);
      if (distributionResult === 'unreapable') {
        result = 'unreapable';
      } else if (
        result !== 'unreapable' &&
        distributionResult === 'index-incomplete'
      ) {
        result = 'index-incomplete';
      } else if (
        result !== 'unreapable' &&
        result !== 'index-incomplete' &&
        distributionResult === 'disable-requested'
      ) {
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
      this.log(
        'CloudFront distribution summary is missing an id. Retaining its origin bucket because the distribution cannot be reaped safely',
      );
      return 'unreapable';
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
  ): {
    bucketNames: Array<string>;
    hasUnrecognizedS3Origin: boolean;
  } => {
    const bucketNames = new Set<string>();
    let hasUnrecognizedS3Origin = false;
    for (const origin of distribution.Origins?.Items ?? []) {
      const originBucketName = this.getOriginBucketName(origin);
      if (originBucketName.kind === 'unrecognized-s3') {
        hasUnrecognizedS3Origin = true;
      } else if (
        originBucketName.kind === 'matched' &&
        originBucketName.bucket.startsWith(this.testResourcePrefix)
      ) {
        bucketNames.add(originBucketName.bucket);
      }
    }
    return { bucketNames: [...bucketNames], hasUnrecognizedS3Origin };
  };

  /**
   * Extracts the origin bucket name from an origin, covering every S3 origin form we may find in
   * the test accounts. An origin form that is not recognized here makes its bucket look origin
   * free, therefore each form must be handled explicitly rather than falling through.
   */
  private getOriginBucketName = (origin: Origin): OriginBucketNameResult => {
    const domainName = origin.DomainName;
    if (!domainName) {
      return origin.S3OriginConfig
        ? { kind: 'unrecognized-s3' }
        : { kind: 'not-s3' };
    }
    // A domain name is normally a bare host, but tolerate one that carries a path style path.
    const [host, ...domainNamePathSegments] = domainName.split('/');
    const virtualHostedBucketName =
      S3_VIRTUAL_HOSTED_ORIGIN_DOMAIN_PATTERN.exec(host)?.[1];
    if (virtualHostedBucketName) {
      return { kind: 'matched', bucket: virtualHostedBucketName };
    }
    if (S3_PATH_STYLE_ORIGIN_HOST_PATTERN.test(host)) {
      // Legacy path style: the host names no bucket, the leading path segment does.
      const pathStyleBucketName =
        this.getLeadingPathSegment(domainNamePathSegments.join('/')) ??
        this.getLeadingPathSegment(origin.OriginPath);
      if (pathStyleBucketName) {
        return { kind: 'matched', bucket: pathStyleBucketName };
      }
      return origin.S3OriginConfig
        ? { kind: 'unrecognized-s3' }
        : { kind: 'not-s3' };
    }
    return origin.S3OriginConfig
      ? { kind: 'unrecognized-s3' }
      : { kind: 'not-s3' };
  };

  private getLeadingPathSegment = (
    path: string | undefined,
  ): string | undefined =>
    path?.split('/').find((segment) => segment.length > 0);

  private getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : '';
}
