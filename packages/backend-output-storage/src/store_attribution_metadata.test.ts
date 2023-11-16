import { describe, it, mock } from 'node:test';
import { App, Stack } from 'aws-cdk-lib';
import * as os from 'os';
import {
  AttributionMetadata,
  AttributionMetadataStorage,
} from './store_attribution_metadata.js';

import assert from 'node:assert';
import { PackageJsonReader } from '@aws-amplify/platform-core';

void describe('storeAttributionMetadata', () => {
  const packageJsonReaderMock = mock.fn(() => {
    return { version: '12.13.14' };
  });
  const packageJsonReader = {
    read: packageJsonReaderMock,
  } as PackageJsonReader;

  void it('does nothing if stack description is already set', () => {
    const app = new App();
    const stack = new Stack(app);
    const originalDescription = 'description is already set';
    stack.templateOptions.description = originalDescription;
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
    assert.equal(stack.templateOptions.description, originalDescription);
  });

  void it('sets CDK deployment type if no CDK context value specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifyCDK');
  });

  void it('sets pipeline deploy type when DeploymentType is branch', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'branch');
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifyPipelineDeploy');
  });

  void it('sets sandbox deploy type when DeploymentType is sandbox', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'sandbox');
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdBy, 'AmplifySandbox');
  });

  void it('sets library version', () => {
    const app = new App();
    const stack = new Stack(app);
    stack.node.setContext('amplify-backend-type', 'sandbox');
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
    const metadata: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.equal(metadata.createdWith, '12.13.14');
  });

  void it('sets additional metadata in attribution payload', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path', {
      some: 'otherData',
    });
    const attribution: AttributionMetadata = JSON.parse(
      stack.templateOptions.description || ''
    );
    assert.deepStrictEqual(attribution.metadata, { some: 'otherData' });
  });

  void it('sets empty additional metadata object if none specified', () => {
    const app = new App();
    const stack = new Stack(app);
    new AttributionMetadataStorage(
      os,
      packageJsonReader
    ).storeAttributionMetadata(stack, 'test', 'some/path');
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
        osMock as never,
        packageJsonReader
      ).storeAttributionMetadata(stack, 'test', 'some/path');
      const metadata: AttributionMetadata = JSON.parse(
        stack.templateOptions.description || ''
      );
      assert.equal(metadata.createdOn, expectedMetadataPlatform);
    });
  });
});
