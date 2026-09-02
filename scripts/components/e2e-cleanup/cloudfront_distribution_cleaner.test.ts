import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFrontClient,
  DeleteDistributionCommand,
  DistributionSummary,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  ListDistributionsCommandOutput,
  Origin,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import {
  BucketToDistributionsIndex,
  CloudFrontDistributionCleaner,
} from './cloudfront_distribution_cleaner.js';

const TEST_RESOURCE_PREFIX = 'amplify-';

const buildDistribution = (
  id: string,
  originDomainNames: Array<string>,
  overrides: Partial<DistributionSummary> = {},
): DistributionSummary =>
  buildDistributionWithOrigins(
    id,
    originDomainNames.map((domainName, index) => ({
      Id: `origin-${index}`,
      DomainName: domainName,
    })),
    overrides,
  );

const buildDistributionWithOrigins = (
  id: string,
  origins: Array<Partial<Origin>>,
  overrides: Partial<DistributionSummary> = {},
): DistributionSummary =>
  ({
    Id: id,
    Status: 'Deployed',
    Enabled: true,
    Origins: {
      Quantity: origins.length,
      Items: origins,
    },
    ...overrides,
  }) as DistributionSummary;

const buildIndex = (
  entries: Array<[string, Array<DistributionSummary>]> = [],
  isComplete = true,
): BucketToDistributionsIndex =>
  new BucketToDistributionsIndex(new Map(entries), isComplete);

const buildCloudFrontClient = (
  handlers: {
    listDistributions?: Array<ListDistributionsCommandOutput | Error>;
    getDistributionConfig?: Array<object | Error>;
    updateDistribution?: Array<object | Error>;
    deleteDistribution?: Array<object | Error>;
  } = {},
) => {
  const respond = (responses: Array<object | Error> | undefined) => {
    const response = responses?.shift();
    return response instanceof Error
      ? Promise.reject(response)
      : Promise.resolve(response ?? {});
  };
  const listDistributions: Array<object | Error> = [
    ...(handlers.listDistributions ?? []),
  ];
  const getDistributionConfig: Array<object | Error> = [
    ...(handlers.getDistributionConfig ?? []),
  ];
  const updateDistribution: Array<object | Error> = [
    ...(handlers.updateDistribution ?? []),
  ];
  const deleteDistribution: Array<object | Error> = [
    ...(handlers.deleteDistribution ?? []),
  ];
  const send = mock.fn((command: unknown) => {
    if (command instanceof ListDistributionsCommand) {
      return respond(listDistributions);
    }
    if (command instanceof GetDistributionConfigCommand) {
      return respond(getDistributionConfig);
    }
    if (command instanceof UpdateDistributionCommand) {
      return respond(updateDistribution);
    }
    if (command instanceof DeleteDistributionCommand) {
      return respond(deleteDistribution);
    }
    return Promise.reject(new Error('Unexpected command'));
  });
  return {
    cloudFrontClient: { send } as unknown as CloudFrontClient,
    send,
  };
};

const getCommandInputs = (
  send: ReturnType<typeof buildCloudFrontClient>['send'],
  commandType: unknown,
): Array<Record<string, unknown>> =>
  send.mock.calls
    .map((call) => call.arguments[0])
    .filter(
      (command) =>
        command instanceof (commandType as new (input: never) => object),
    )
    .map((command) => (command as { input: Record<string, unknown> }).input);

const buildIndexOf = async (
  distributions: Array<DistributionSummary>,
): Promise<BucketToDistributionsIndex> => {
  const { cloudFrontClient } = buildCloudFrontClient({
    listDistributions: [
      {
        DistributionList: { Items: distributions, IsTruncated: false },
        $metadata: {},
      } as ListDistributionsCommandOutput,
    ],
  });
  return new CloudFrontDistributionCleaner(
    cloudFrontClient,
    TEST_RESOURCE_PREFIX,
    () => {},
  ).buildBucketToDistributionsIndex();
};

void describe('CloudFrontDistributionCleaner', () => {
  void describe('buildBucketToDistributionsIndex', () => {
    void it('indexes test bucket origins of all supported domain formats', async () => {
      const index = await buildIndexOf([
        buildDistribution('D1', [
          'amplify-regional.s3.us-west-2.amazonaws.com',
        ]),
        buildDistribution('D2', ['amplify-global.s3.amazonaws.com']),
        buildDistribution('D3', [
          'amplify-website.s3-website-us-west-2.amazonaws.com',
        ]),
        buildDistribution('D4', [
          'amplify-dualstack.s3.dualstack.us-west-2.amazonaws.com',
        ]),
        buildDistribution('D5', [
          'amplify-china.s3.cn-north-1.amazonaws.com.cn',
        ]),
        buildDistributionWithOrigins('D6', [
          {
            Id: 'origin-0',
            DomainName: 's3.us-west-2.amazonaws.com',
            OriginPath: '/amplify-path-style',
          },
        ]),
        buildDistributionWithOrigins('D7', [
          {
            Id: 'origin-0',
            DomainName: 's3.amazonaws.com/amplify-legacy-path-style/site',
          },
        ]),
        buildDistributionWithOrigins('D8', [
          {
            Id: 'origin-0',
            DomainName: 'amplify-odd-suffix.s3.some-new-endpoint.example',
            S3OriginConfig: { OriginAccessIdentity: '' },
          },
        ]),
      ]);

      assert.deepStrictEqual(index.getBucketNames().sort(), [
        'amplify-china',
        'amplify-dualstack',
        'amplify-global',
        'amplify-legacy-path-style',
        'amplify-odd-suffix',
        'amplify-path-style',
        'amplify-regional',
        'amplify-website',
      ]);
      assert.strictEqual(index.isComplete, true);
      assert.strictEqual(
        index.getDistributions('amplify-regional')[0].Id,
        'D1',
      );
      assert.strictEqual(
        index.getDistributions('amplify-legacy-path-style')[0].Id,
        'D7',
      );
      assert.strictEqual(
        index.getDistributions('amplify-odd-suffix')[0].Id,
        'D8',
      );
    });

    void it('ignores origins that are not test buckets and follows pagination', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient({
        listDistributions: [
          {
            DistributionList: {
              Items: [
                buildDistribution('D1', [
                  'example.com',
                  'other-bucket.s3.us-west-2.amazonaws.com',
                  'api.execute-api.us-west-2.amazonaws.com',
                ]),
              ],
              IsTruncated: true,
              NextMarker: 'D1',
            },
            $metadata: {},
          } as ListDistributionsCommandOutput,
          {
            DistributionList: {
              Items: [
                buildDistribution('D2', [
                  'amplify-app.s3.us-west-2.amazonaws.com',
                  'amplify-app.s3.us-west-2.amazonaws.com',
                ]),
              ],
              IsTruncated: false,
            },
            $metadata: {},
          } as ListDistributionsCommandOutput,
        ],
      });

      const index = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).buildBucketToDistributionsIndex();

      assert.deepStrictEqual(getCommandInputs(send, ListDistributionsCommand), [
        { Marker: undefined },
        { Marker: 'D1' },
      ]);
      assert.deepStrictEqual(index.getBucketNames(), ['amplify-app']);
      assert.strictEqual(index.getDistributions('amplify-app').length, 1);
    });

    void it('ignores origins that are not S3 buckets at all', async () => {
      const index = await buildIndexOf([
        buildDistributionWithOrigins('D1', [
          { Id: 'origin-0', DomainName: 'amplify-app.example.com' },
          {
            Id: 'origin-1',
            DomainName: 'amplify-api.execute-api.us-west-2.amazonaws.com',
          },
          {
            Id: 'origin-2',
            DomainName: 'amplify-lb.elb.us-west-2.amazonaws.com',
            CustomOriginConfig: {
              HTTPPort: 80,
              HTTPSPort: 443,
              OriginProtocolPolicy: 'https-only',
            },
          },
          { Id: 'origin-3', DomainName: 's3.us-west-2.amazonaws.com' },
        ]),
      ]);

      assert.deepStrictEqual(index.getBucketNames(), []);
      assert.strictEqual(index.isComplete, true);
    });

    void it('reports an incomplete index instead of throwing when listing is not permitted', async () => {
      const logMessages: Array<string> = [];
      const { cloudFrontClient } = buildCloudFrontClient({
        listDistributions: [
          new Error(
            'User is not authorized to perform cloudfront:ListDistributions',
          ),
        ],
      });

      const index = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        (message) => logMessages.push(message),
      ).buildBucketToDistributionsIndex();

      assert.strictEqual(index.isComplete, false);
      assert.deepStrictEqual(index.getBucketNames(), []);
      assert.ok(
        logMessages.some((message) =>
          message.includes('Unable to list CloudFront distributions'),
        ),
      );
    });

    void it('reports an incomplete index when a later page of distributions cannot be listed', async () => {
      const { cloudFrontClient } = buildCloudFrontClient({
        listDistributions: [
          {
            DistributionList: {
              Items: [
                buildDistribution('D1', [
                  'amplify-app.s3.us-west-2.amazonaws.com',
                ]),
              ],
              IsTruncated: true,
              NextMarker: 'D1',
            },
            $metadata: {},
          } as ListDistributionsCommandOutput,
          new Error('Rate exceeded'),
        ],
      });

      const index = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).buildBucketToDistributionsIndex();

      assert.strictEqual(index.isComplete, false);
    });
  });

  void describe('reapDistributionsForBucket', () => {
    void it('reports none when the bucket has no distributions', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient();

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket('amplify-app', buildIndex());

      assert.strictEqual(result, 'none');
      assert.strictEqual(send.mock.callCount(), 0);
    });

    void it('reports index-incomplete without calling CloudFront when the index is incomplete', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient();

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket('amplify-app', buildIndex([], false));

      assert.strictEqual(result, 'index-incomplete');
      assert.strictEqual(send.mock.callCount(), 0);
    });

    void it('disables an enabled distribution and keeps the bucket', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient({
        getDistributionConfig: [
          {
            ETag: 'version-1',
            DistributionConfig: { Enabled: true, Comment: 'x' },
          },
        ],
      });
      const distribution = buildDistribution('D1', [
        'amplify-app.s3.us-west-2.amazonaws.com',
      ]);

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket(
        'amplify-app',
        buildIndex([['amplify-app', [distribution]]]),
      );

      assert.strictEqual(result, 'disable-requested');
      assert.deepStrictEqual(
        getCommandInputs(send, UpdateDistributionCommand),
        [
          {
            Id: 'D1',
            IfMatch: 'version-1',
            DistributionConfig: { Enabled: false, Comment: 'x' },
          },
        ],
      );
      assert.strictEqual(
        getCommandInputs(send, DeleteDistributionCommand).length,
        0,
      );
    });

    void it('waits for a disabled distribution that is not deployed yet', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient();
      const distribution = buildDistribution(
        'D1',
        ['amplify-app.s3.us-west-2.amazonaws.com'],
        { Enabled: false, Status: 'InProgress' },
      );

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket(
        'amplify-app',
        buildIndex([['amplify-app', [distribution]]]),
      );

      assert.strictEqual(result, 'disable-requested');
      assert.strictEqual(send.mock.callCount(), 0);
    });

    void it('deletes a distribution that is disabled and deployed', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient({
        getDistributionConfig: [
          { ETag: 'version-2', DistributionConfig: { Enabled: false } },
        ],
      });
      const distribution = buildDistribution(
        'D1',
        ['amplify-app.s3.us-west-2.amazonaws.com'],
        { Enabled: false, Status: 'Deployed' },
      );

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket(
        'amplify-app',
        buildIndex([['amplify-app', [distribution]]]),
      );

      assert.strictEqual(result, 'deleted');
      assert.deepStrictEqual(
        getCommandInputs(send, DeleteDistributionCommand),
        [{ Id: 'D1', IfMatch: 'version-2' }],
      );
    });

    void it('keeps the bucket when a distribution cannot be reaped', async () => {
      const logMessages: Array<string> = [];
      const { cloudFrontClient } = buildCloudFrontClient({
        getDistributionConfig: [new Error('PreconditionFailed')],
      });
      const distribution = buildDistribution(
        'D1',
        ['amplify-app.s3.us-west-2.amazonaws.com'],
        { Enabled: false, Status: 'Deployed' },
      );

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        (message) => logMessages.push(message),
      ).reapDistributionsForBucket(
        'amplify-app',
        buildIndex([['amplify-app', [distribution]]]),
      );

      assert.strictEqual(result, 'disable-requested');
      assert.ok(
        logMessages.some((message) =>
          message.includes('Retaining its origin bucket'),
        ),
      );
    });

    void it('keeps the bucket when only one of the distributions is gone', async () => {
      const { cloudFrontClient } = buildCloudFrontClient({
        getDistributionConfig: [
          { ETag: 'version-1', DistributionConfig: { Enabled: false } },
          { ETag: 'version-2', DistributionConfig: { Enabled: true } },
        ],
      });
      const distributions = [
        buildDistribution('D1', ['amplify-app.s3.us-west-2.amazonaws.com'], {
          Enabled: false,
          Status: 'Deployed',
        }),
        buildDistribution('D2', ['amplify-app.s3.us-west-2.amazonaws.com']),
      ];

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket(
        'amplify-app',
        buildIndex([['amplify-app', distributions]]),
      );

      assert.strictEqual(result, 'disable-requested');
    });
  });
});
