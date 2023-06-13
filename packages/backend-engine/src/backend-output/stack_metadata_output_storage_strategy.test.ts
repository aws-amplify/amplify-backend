import { describe, it } from 'node:test';
import { StackMetadataOutputStorageStrategy } from './stack_metadata_output_storage_strategy.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { backendOutputSchema } from './backend_output_schemas.js';

describe('StackMetadataOutputStorageStrategy', () => {
  describe('storeOutput', () => {
    it('adds stack output and metadata for entry', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataOutputStorageStrategy(stack);
      outputStorage.storeOutput('test-package', '2.0.0', {
        something: 'special',
      });

      const template = Template.fromStack(stack);
      template.hasOutput('something', { Value: 'special' });
      template.templateMatches({
        Metadata: {
          'test-package': {
            constructVersion: '2.0.0',
            stackOutputs: ['something'],
          },
        },
      });
    });

    it('conforms stack metadata to primitive type', () => {
      const app = new App();
      const stack = new Stack(app);
      const outputStorage = new StackMetadataOutputStorageStrategy(stack);
      outputStorage.storeOutput('test-package', '2.0.0', {
        something: 'special',
      });

      const template = Template.fromStack(stack);
      // successfully parsing the metadata means it validated against the schema
      backendOutputSchema.parse(template.toJSON().Metadata);
    });
  });
});
