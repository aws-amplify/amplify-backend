import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CloudFrontClient,
  DeleteDistributionCommand,
  DistributionSummary,
  GetDistributionConfigCommand,
  ListDistributionsCommand,
  ListDistributionsCommandOutput,
  UpdateDistributionCommand,
} from '@aws-sdk/client-cloudfront';
import { CloudFrontDistributionCleaner } from './cloudfront_distribution_cleaner.js';

const TEST_RESOURCE_PREFIX = 'amplify-';

const buildDistribution = (
  id: string,
  originDomainNames: Array<string>,
  overrides: Partial<DistributionSummary> = {},
): DistributionSummary =>
  ({
    Id: id,
    Status: 'Deployed',
    Enabled: true,
    Origins: {
      Quantity: originDomainNames.length,
      Items: originDomainNames.map((domainName, index) => ({
        Id: `origin-${index}`,
        DomainName: domainName,
      })),
    },
    ...overrides,
  }) as DistributionSummary;

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

void describe('CloudFrontDistributionCleaner', () => {
  void describe('buildBucketToDistributionsIndex', () => {
    void it('indexes test bucket origins of all supported domain formats', async () => {
      const { cloudFrontClient } = buildCloudFrontClient({
        listDistributions: [
          {
            DistributionList: {
              Items: [
                buildDistribution('D1', [
                  'amplify-regional.s3.us-west-2.amazonaws.com',
                ]),
                buildDistribution('D2', ['amplify-global.s3.amazonaws.com']),
                buildDistribution('D3', [
                  'amplify-website.s3-website-us-west-2.amazonaws.com',
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

      assert.deepStrictEqual([...index.keys()].sort(), [
        'amplify-global',
        'amplify-regional',
        'amplify-website',
      ]);
      assert.strictEqual(index.get('amplify-regional')?.[0].Id, 'D1');
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
      assert.deepStrictEqual([...index.keys()], ['amplify-app']);
      assert.strictEqual(index.get('amplify-app')?.length, 1);
    });

    void it('returns an empty index instead of throwing when listing is not permitted', async () => {
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

      assert.strictEqual(index.size, 0);
      assert.ok(
        logMessages.some((message) =>
          message.includes('Unable to list CloudFront distributions'),
        ),
      );
    });
  });

  void describe('reapDistributionsForBucket', () => {
    void it('reports none when the bucket has no distributions', async () => {
      const { cloudFrontClient, send } = buildCloudFrontClient();

      const result = await new CloudFrontDistributionCleaner(
        cloudFrontClient,
        TEST_RESOURCE_PREFIX,
        () => {},
      ).reapDistributionsForBucket('amplify-app', new Map());

      assert.strictEqual(result, 'none');
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
        new Map([['amplify-app', [distribution]]]),
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
        new Map([['amplify-app', [distribution]]]),
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
        new Map([['amplify-app', [distribution]]]),
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
        new Map([['amplify-app', [distribution]]]),
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
        new Map([['amplify-app', distributions]]),
      );

      assert.strictEqual(result, 'disable-requested');
    });
  });
});
