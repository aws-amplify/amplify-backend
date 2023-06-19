import { describe, it, mock } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import assert from 'node:assert';
import packageJson from '#package.json';
import { Bucket } from 'aws-cdk-lib/aws-s3';

describe('AmplifyStorage', () => {
  it('creates a bucket', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', {});
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
  });

  it('turns versioning on if specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyStorage(stack, 'test', { versioned: true });
    const template = Template.fromStack(stack);
    template.resourceCountIs('AWS::S3::Bucket', 1);
    template.hasResourceProperties('AWS::S3::Bucket', {
      VersioningConfiguration: { Status: 'Enabled' },
    });
  });
  describe('storeOutput', () => {
    it('stores output using the provided strategy', () => {
      const app = new App();
      const stack = new Stack(app);
      const storageConstruct = new AmplifyStorage(stack, 'test', {});

      const storeOutputMock = mock.fn();
      const storageStrategy: BackendOutputStorageStrategy = {
        addBackendOutputEntry: storeOutputMock,
        flush: mock.fn(),
      };
      storageConstruct.storeOutput(storageStrategy);

      const expectedBucketName = (
        storageConstruct.node.findChild('testBucket') as Bucket
      ).bucketName;

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.strictEqual(storeOutputArgs.length, 2);

      const [actualPackageName, actualOutputEntry] = storeOutputArgs;
      assert.strictEqual(actualPackageName, packageJson.name);
      assert.deepStrictEqual(actualOutputEntry, {
        constructVersion: packageJson.version,
        data: {
          bucketName: expectedBucketName,
        },
      });
    });
  });
});
