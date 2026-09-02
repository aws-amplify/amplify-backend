import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  DeleteBucketCommand,
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import {
  CloudFrontClient,
  DeleteDistributionCommand,
  DistributionSummary,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { S3BucketEmptier } from './s3_bucket_emptier.js';
import {
  BucketToDistributionsIndex,
  CloudFrontDistributionCleaner,
} from './cloudfront_distribution_cleaner.js';
import { StaleBucketSweeper } from './stale_bucket_sweeper.js';

const TEST_RESOURCE_PREFIX = 'amplify-';

const buildS3Client = (deleteBucketError?: Error) => {
  const send = mock.fn((command: unknown) => {
    if (command instanceof ListObjectVersionsCommand) {
      return Promise.resolve({ IsTruncated: false });
    }
    if (command instanceof DeleteObjectsCommand) {
      return Promise.resolve({});
    }
    if (command instanceof DeleteBucketCommand) {
      return deleteBucketError
        ? Promise.reject(deleteBucketError)
        : Promise.resolve({});
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return { s3Client: { send } as unknown as S3Client, send };
};

const buildCloudFrontClient = () => {
  const send = mock.fn((command: unknown) => {
    if (
      command instanceof GetDistributionConfigCommand ||
      command instanceof UpdateDistributionCommand ||
      command instanceof DeleteDistributionCommand ||
      command instanceof ListDistributionsCommand
    ) {
      return Promise.resolve({
        ETag: 'version-1',
        DistributionConfig: { Enabled: true },
      });
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return { cloudFrontClient: { send } as unknown as CloudFrontClient, send };
};

const getDeletedBucketNames = (
  send: ReturnType<typeof buildS3Client>['send'],
): Array<unknown> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter((command) => command instanceof DeleteBucketCommand)
    .map((command) => (command as DeleteBucketCommand).input.Bucket as unknown);

const buildEnabledDistribution = (id: string): DistributionSummary =>
  ({ Id: id, Enabled: true, Status: 'Deployed' }) as DistributionSummary;

const buildSweeper = (
  options: {
    ownedBucketNames?: Array<string>;
    deleteBucketError?: Error;
    signalIncompleteRun?: () => void;
  } = {},
) => {
  const logMessages: Array<string> = [];
  const { s3Client, send: s3Send } = buildS3Client(options.deleteBucketError);
  const { cloudFrontClient, send: cloudFrontSend } = buildCloudFrontClient();
  const sweeper = new StaleBucketSweeper(
    new S3BucketEmptier(s3Client, () => {}),
    new CloudFrontDistributionCleaner(
      cloudFrontClient,
      TEST_RESOURCE_PREFIX,
      () => {},
    ),
    (bucketName) => (options.ownedBucketNames ?? []).includes(bucketName),
    (message) => logMessages.push(message),
    options.signalIncompleteRun ?? (() => {}),
  );
  return { sweeper, s3Send, cloudFrontSend, logMessages };
};

void describe('StaleBucketSweeper', () => {
  void it('retains every bucket and fails the run when the distribution index is incomplete', async () => {
    let incompleteRunSignalCount = 0;
    const { sweeper, s3Send, cloudFrontSend, logMessages } = buildSweeper({
      signalIncompleteRun: () => {
        incompleteRunSignalCount += 1;
      },
    });

    const result = await sweeper.sweep(
      ['amplify-app-1', 'amplify-app-2'],
      new BucketToDistributionsIndex(new Map(), false),
    );

    assert.deepStrictEqual(result, {
      deletedBucketNames: [],
      retainedBucketNames: ['amplify-app-1', 'amplify-app-2'],
    });
    assert.strictEqual(s3Send.mock.callCount(), 0);
    assert.strictEqual(cloudFrontSend.mock.callCount(), 0);
    assert.strictEqual(incompleteRunSignalCount, 1);
    assert.ok(
      logMessages.some(
        (message) =>
          message.includes('Retaining all 2 stale buckets') &&
          message.includes('CloudFront distribution index is incomplete'),
      ),
    );
  });

  void it('fails the process by default when the distribution index is incomplete', async () => {
    const previousExitCode = process.exitCode;
    try {
      process.exitCode = 0;
      const { s3Client } = buildS3Client();
      const { cloudFrontClient } = buildCloudFrontClient();
      const sweeper = new StaleBucketSweeper(
        new S3BucketEmptier(s3Client, () => {}),
        new CloudFrontDistributionCleaner(
          cloudFrontClient,
          TEST_RESOURCE_PREFIX,
          () => {},
        ),
        () => false,
        () => {},
      );

      await sweeper.sweep(
        ['amplify-app-1'],
        new BucketToDistributionsIndex(new Map(), false),
      );

      assert.strictEqual(process.exitCode, 1);
    } finally {
      process.exitCode = previousExitCode;
    }
  });

  void it('deletes a bucket that no live stack and no distribution uses', async () => {
    const index = new BucketToDistributionsIndex(new Map(), true);
    const { sweeper, s3Send, logMessages } = buildSweeper();

    const result = await sweeper.sweep(['amplify-app-1'], index);

    assert.deepStrictEqual(result, {
      deletedBucketNames: ['amplify-app-1'],
      retainedBucketNames: [],
    });
    assert.deepStrictEqual(getDeletedBucketNames(s3Send), ['amplify-app-1']);
    assert.ok(
      logMessages.includes('Successfully deleted amplify-app-1 bucket'),
    );
  });

  void it('retains a bucket that a distribution still uses as an origin', async () => {
    const index = new BucketToDistributionsIndex(
      new Map([['amplify-app-1', [buildEnabledDistribution('D1')]]]),
      true,
    );
    const { sweeper, s3Send, cloudFrontSend, logMessages } = buildSweeper();

    const result = await sweeper.sweep(
      ['amplify-app-1', 'amplify-app-2'],
      index,
    );

    assert.deepStrictEqual(result, {
      deletedBucketNames: ['amplify-app-2'],
      retainedBucketNames: ['amplify-app-1'],
    });
    assert.deepStrictEqual(getDeletedBucketNames(s3Send), ['amplify-app-2']);
    assert.ok(cloudFrontSend.mock.callCount() > 0);
    assert.ok(
      logMessages.includes(
        'Retaining amplify-app-1 bucket. A CloudFront distribution still uses it as an origin',
      ),
    );
  });

  void it('skips a bucket that a live stack still owns without touching CloudFront', async () => {
    const index = new BucketToDistributionsIndex(new Map(), true);
    const { sweeper, s3Send, cloudFrontSend } = buildSweeper({
      ownedBucketNames: ['amplify-app-1'],
    });

    const result = await sweeper.sweep(['amplify-app-1'], index);

    assert.deepStrictEqual(result, {
      deletedBucketNames: [],
      retainedBucketNames: ['amplify-app-1'],
    });
    assert.strictEqual(s3Send.mock.callCount(), 0);
    assert.strictEqual(cloudFrontSend.mock.callCount(), 0);
  });

  void it('keeps sweeping the remaining buckets when one delete fails', async () => {
    const index = new BucketToDistributionsIndex(new Map(), true);
    const { sweeper, logMessages } = buildSweeper({
      deleteBucketError: new Error('AccessDenied'),
    });

    const result = await sweeper.sweep(
      ['amplify-app-1', 'amplify-app-2'],
      index,
    );

    assert.deepStrictEqual(result, {
      deletedBucketNames: [],
      retainedBucketNames: ['amplify-app-1', 'amplify-app-2'],
    });
    assert.ok(
      logMessages.includes(
        'Failed to delete amplify-app-1 bucket. AccessDenied',
      ),
    );
    assert.ok(
      logMessages.includes(
        'Failed to delete amplify-app-2 bucket. AccessDenied',
      ),
    );
  });
});
