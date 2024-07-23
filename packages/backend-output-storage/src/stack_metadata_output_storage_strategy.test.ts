import { describe, it } from 'node:test';
import { StackMetadataBackendOutputStorageStrategy } from './stack_metadata_output_storage_strategy.js';
import { App, Stack, Token } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { backendOutputStackMetadataSchema } from '@aws-amplify/backend-output-schemas';
import assert from 'assert';

void describe('StackMetadataBackendOutputStorageStrategy', () => {
  void describe('addBackendOutputEntry', () => {
    void it('adds stack output and metadata for entry', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.addBackendOutputEntry('TestStorageOutput', {
        version: '1',
        payload: {
          bucketName: 'test-bucket',
          storageRegion: 'us-west-2',
        },
      });

      const template = Template.fromStack(stack);
      template.hasOutput('bucketName', { Value: 'test-bucket' });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['bucketName', 'storageRegion'],
          },
        },
      });
    });

    void it('conforms stack metadata to primitive type', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.addBackendOutputEntry('TestStorageOutput', {
        version: '44',
        payload: {
          bucketName: 'test-bucket',
          storageRegion: 'us-west-2',
        },
      });

      const template = Template.fromStack(stack);
      // successfully parsing the metadata means it validated against the schema
      backendOutputStackMetadataSchema.parse(template.toJSON().Metadata);
    });
  });

  void describe('appendToBackendOutputList', () => {
    void it('adds list to stack output and metadata for entry', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: 'test-bucket',
        },
      });

      const template = Template.fromStack(stack);
      template.hasOutput('buckets', {
        Value: JSON.stringify(['test-bucket']),
      });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['buckets'],
          },
        },
      });
    });

    void it('appends to an existing list in stack output', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: JSON.stringify({
            name: 'test-bucket',
            bucketName: 'test-bucket',
            storageRegion: 'us-west-2',
          }),
        },
      });
      outputStorage.addBackendOutputEntry('TestStorageOutput', {
        version: '1',
        payload: {
          bucketName: 'test-bucket-two',
          storageRegion: 'us-west-2',
        },
      });
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: JSON.stringify({
            name: 'test-bucket-two',
            bucketName: 'test-bucket-two',
            storageRegion: 'us-west-2',
          }),
        },
      });
      const template = Template.fromStack(stack);
      template.hasOutput('buckets', {
        Value: JSON.stringify([
          '{"name":"test-bucket","bucketName":"test-bucket","storageRegion":"us-west-2"}',
          '{"name":"test-bucket-two","bucketName":"test-bucket-two","storageRegion":"us-west-2"}',
        ]),
      });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['buckets', 'bucketName', 'storageRegion'],
          },
        },
      });
    });

    void it('appends a cdk token to an existing list in stack output with two buckets', () => {
      const testToken = Token.asString('testToken');
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.addBackendOutputEntry('TestStorageOutput', {
        version: '1',
        payload: {
          bucketName: testToken,
          storageRegion: 'us-west-2',
        },
      });
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: JSON.stringify({
            name: testToken,
            bucketName: testToken,
            storageRegion: 'us-west-2',
          }),
        },
      });
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: JSON.stringify({
            name: 'test-bucket-two',
            bucketName: 'test-bucket-two',
            storageRegion: 'us-west-2',
          }),
        },
      });
      const template = Template.fromStack(stack);
      template.hasOutput('buckets', {
        Value: JSON.stringify([
          '{"name":"testToken","bucketName":"testToken","storageRegion":"us-west-2"}',
          '{"name":"test-bucket-two","bucketName":"test-bucket-two","storageRegion":"us-west-2"}',
        ]),
      });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['buckets', 'bucketName', 'storageRegion'],
          },
        },
      });
    });

    void it('throws when trying to add to same list with different version', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          buckets: 'test-bucket',
        },
      });

      assert.throws(
        () =>
          outputStorage.appendToBackendOutputList('TestStorageOutput', {
            version: '2',
            payload: {
              bucketName: 'test-bucket',
              storageRegion: 'us-west-2',
            },
          }),
        {
          message:
            'Metadata entry for TestStorageOutput at version 1 already exists. Cannot add another entry for the same key at version 2.',
        }
      );
    });
  });
});
