import { describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import {
  AttributionMetadata,
  AttributionMetadataStorage,
} from './store_attribution_metadata.js';
import assert from 'node:assert';

void describe('storeAttributionMetadata', () => {
  const existsSyncMock = mock.fn(() => true);
  const readFileSyncMock = mock.fn(() =>
    JSON.stringify({ version: '12.13.14' })
  );
  const fsMock = {
    existsSync: existsSyncMock,
    readFileSync: readFileSyncMock,
  };

  void it('does nothing if stack description is already set', () => {
    const app = new App();
    const stack = new Stack(app);
    const originalDescription = 'description is already set';
    stack.templateOptions.description = originalDescription;
    new AttributionMetadataStorage().storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    assert.equal(stack.templateOptions.description, originalDescription);
  });

  void it('throws if provided package json file cannot be found', () => {
    const app = new App();
    const stack = new Stack(app);
    existsSyncMock.mock.mockImplementationOnce(() => false);
    assert.throws(
      () =>
        new AttributionMetadataStorage(
          fsMock as never
        ).storeAttributionMetadata(stack, 'test', 'some/path'),
      { message: 'Could not find some/path to load library version from' }
    );
  });

  void it('throws if provided package json file does not contain a version field', () => {
    const app = new App();
    const stack = new Stack(app);
    readFileSyncMock.mock.mockImplementationOnce(() =>
      JSON.stringify({ invalid: 'value' })
    );
    assert.throws(
      () =>
        new AttributionMetadataStorage(
          fsMock as never
        ).storeAttributionMetadata(stack, 'test', 'some/path'),
      { message: 'Could not parse library version from some/path' }
    );
  });

  void it('sets CDK deployment type if no CDK context value specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifyCDK');
  });

  void it('sets pipeline deploy type when DeploymentType is branch', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'branch');
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifyPipelineDeploy');
  });

  void it('sets sandbox deploy type when DeploymentType is sandbox', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'sandbox');
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifySandbox');
  });

  void it('sets library version', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'sandbox');
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdWith, '12.13.14');
  });

  void it('sets additional metadata in attribution payload', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path',
      { some: 'otherData' }
    );
    const attribution: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.deepStrictEqual(attribution.metadata, { some: 'otherData' });
  });

  void it('sets empty additional metadata object if none specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(fsMock as never).storeAttributionMetadata(
      stack,
      'test',
      'some/path'
    );
    const attribution: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.deepStrictEqual(attribution.metadata, {});
  });

  const platformTests = [
    { nodePlatform: 'darwin', expectedMetadataPlatform: 'Mac' },
    { nodePlatform: 'win32', expectedMetadataPlatform: 'Windows' },
    { nodePlatform: 'linux', expectedMetadataPlatform: 'Linux' },
    { nodePlatform: 'android', expectedMetadataPlatform: 'Other' },
  ];

  platformTests.forEach(({ nodePlatform, expectedMetadataPlatform }) => {
    void it(`sets ${expectedMetadataPlatform} platform on ${nodePlatform}`, () => {
      const osMock = {
        platform: mock.fn(() => nodePlatform),
      };
      const app = new App();
      const stack = new Stack(app);
      new AttributionMetadataStorage(
        fsMock as never,
        osMock as never
      ).storeAttributionMetadata(stack, 'test', 'some/path');
      const metadata: AttributionMetadata = JSON.parse(
        stack.templateOptions.description || ''
      );
      assert.equal(metadata.createdOn, expectedMetadataPlatform);
    });
  });
});
