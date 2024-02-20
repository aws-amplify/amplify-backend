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
          something: 'special',
        },
      });

      const template = Template.fromStack(stack);
      template.hasOutput('something', { Value: 'special' });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['something'],
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
          something: 'special',
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
          something: 'special',
        },
      });

      const template = Template.fromStack(stack);
      template.hasOutput('something', { Value: JSON.stringify(['special']) });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['something'],
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
          something: 'special',
        },
      });
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          something: 'otherSpecial',
        },
      });
      const template = Template.fromStack(stack);
      template.hasOutput('something', {
        Value: JSON.stringify(['special', 'otherSpecial']),
      });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['something'],
          },
        },
      });
    });

    void it('appends a cdk token to an existing list in stack output', () => {
      const testToken = Token.asString('testToken');
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataBackendOutputStorageStrategy(
        stack
      );
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          something: 'special',
        },
      });
      outputStorage.appendToBackendOutputList('TestStorageOutput', {
        version: '1',
        payload: {
          something: testToken,
        },
      });
      const template = Template.fromStack(stack);
      template.hasOutput('something', {
        Value: JSON.stringify(['special', 'testToken']),
      });
      template.templateMatches({
        Metadata: {
          TestStorageOutput: {
            version: '1',
            stackOutputs: ['something'],
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
          something: 'special',
        },
      });

      assert.throws(
        () =>
          outputStorage.appendToBackendOutputList('TestStorageOutput', {
            version: '2',
            payload: {
              something: 'otherSpecial',
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
