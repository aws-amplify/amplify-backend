import { describe, it, mock } from 'node:test';
import { AmplifyStorage } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { OutputStorageStrategy } from '@aws-amplify/backend-types';
import assert from 'node:assert';
import packageJson from '#package.json';

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
      const storageStrategy: OutputStorageStrategy = {
        storeOutput: storeOutputMock,
      };
      storageConstruct.storeOutput(storageStrategy);

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.equal(storeOutputArgs.length, 3);

      const [actualPackageName, actualVersionName, data] = storeOutputArgs;
      assert.equal(actualPackageName, packageJson.name);
      assert.equal(actualVersionName, packageJson.version);
      assert.equal(Object.keys(data).length, 1);
      assert.equal(Object.keys(data)[0], 'bucketName');
    });
  });
});
