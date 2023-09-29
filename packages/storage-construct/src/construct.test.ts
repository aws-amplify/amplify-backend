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
    new AmplifyStorage(stack, 'test', {});
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  void it('turns versioning on if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { versioned: true });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
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
        };

      const storageConstruct = new AmplifyStorage(stack, 'test', {
        outputStorageStrategy: storageStrategy,
      });

      const expectedBucketName = (
        storageConstruct.node.findChild('testBucket') as Bucket
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

      new AmplifyStorage(stack, 'test', {});
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
});
