import { describe, it, mock } from 'node:test';
import {
  AmplifyBackendOutput,
  OutputRetrievalStrategy,
} from '@aws-amplify/plugin-types';
import { DefaultClientConfigGenerator } from './client_config_generator.js';
import assert from 'node:assert';

describe('ClientConfigGenerator', () => {
  describe('generateClientConfig', () => {
    it('TODO pass through of backend output for now', async () => {
      const stubOutput: AmplifyBackendOutput = {
        packageName: {
          constructVersion: '1.0.0',
          data: {
            someKey: 'someValue',
          },
        },
      };
      const outputRetrieval: OutputRetrievalStrategy = {
        fetchAllOutput: mock.fn(async () => stubOutput),
      };

      const clientConfigGenerator = new DefaultClientConfigGenerator(
        outputRetrieval
      );
      const result = await clientConfigGenerator.generateClientConfig();
      assert.deepStrictEqual(result, stubOutput);
    });
  });
});
