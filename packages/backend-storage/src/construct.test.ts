import { describe, it, mock } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { storageOutputKey } from '@aws-amplify/backend-output-schemas';

void describe('AmplifyStorage', () => {
  void it('creates a bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { name: 'testName' });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('turns versioning on if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { versioned: true, name: 'testName' });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });

  void it('stores attribution data in stack', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testAuth', { name: 'testName' });

    const template = Template.fromStack(stack);
    assert.equal(
      JSON.parse(template.toJSON().Description).stackType,
      'storage-S3'
    );
  });

  void it('enables cors on the bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testAuth', { name: 'testName' });

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::S3::Bucket', {
      CorsConfiguration: {
        CorsRules: [
          {
            AllowedHeaders: ['*'],
            AllowedMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE'],
            AllowedOrigins: ['*'],
            ExposedHeaders: [
              'x-amz-server-side-encryption',
              'x-amz-request-id',
              'x-amz-id-2',
              'ETag',
            ],
            MaxAge: 3000,
          },
        ],
      },
    });
  });

  void it('sets destroy retain policy and auto-delete objects true', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'testBucketId', { name: 'testName' });

    const template = Template.fromStack(stack);
    const buckets = template.findResources('AWS::S3::Bucket');
    const bucketLogicalIds = Object.keys(buckets);
    assert.equal(bucketLogicalIds.length, 1);
    const bucket = buckets[bucketLogicalIds[0]];
    assert.equal(bucket.DeletionPolicy, 'Delete');
    assert.equal(bucket.UpdateReplacePolicy, 'Delete');

    template.hasResourceProperties('Custom::S3AutoDeleteObjects', {
      BucketName: {
        Ref: 'testBucketIdBucket3B30067A',
      },
    });
  });

  void describe('storeOutput', () => {
    void it('stores output using the provided strategy', () => {
      const app = new App();
      const stack = new Stack(app);

      const storeOutputMock = mock.fn();
      const storageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
        {
          addBackendOutputEntry: storeOutputMock,
          appendToBackendOutputList: storeOutputMock,
        };

      const storageConstruct = new AmplifyStorage(stack, 'test', {
        name: 'testName',
        outputStorageStrategy: storageStrategy,
      });

      const expectedBucketName = (
        storageConstruct.node.findChild('Bucket') as Bucket
      ).bucketName;
      const expectedRegion = Stack.of(storageConstruct).region;

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.strictEqual(storeOutputArgs.length, 2);

      assert.deepStrictEqual(storeOutputArgs, [
        storageOutputKey,
        {
          version: '1',
          payload: {
            bucketName: expectedBucketName,
            storageRegion: expectedRegion,
          },
        },
      ]);
    });
    void it('stores output when no storage strategy is injected', () => {
      const app = new App();
      const stack = new Stack(app);

      new AmplifyStorage(stack, 'test', { name: 'testName' });
      const template = Template.fromStack(stack);
      template.templateMatches({
        Metadata: {
          [storageOutputKey]: {
            version: '1',
            stackOutputs: ['storageRegion', 'bucketName'],
          },
        },
      });
    });
  });

  void describe('storage overrides', () => {
    void it('can override bucket properties', () => {
      const app = new App();
      const stack = new Stack(app);

      const bucket = new AmplifyStorage(stack, 'test', { name: 'testName' });
      bucket.resources.cfnResources.cfnBucket.accelerateConfiguration = {
        accelerationStatus: 'Enabled',
      };

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::S3::Bucket', {
        AccelerateConfiguration: {
          AccelerationStatus: 'Enabled',
        },
      });
    });
  });
});
