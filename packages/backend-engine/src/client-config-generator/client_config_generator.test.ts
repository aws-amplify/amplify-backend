import { describe, it, mock } from 'node:test';
import {
  BackendOutput,
  OutputRetrievalStrategy,
} from '@aws-amplify/plugin-types';
import { DefaultClientConfigGenerator } from './client_config_generator.js';
import assert from 'node:assert';

describe('ClientConfigGenerator', () => {
  describe('generateClientConfig', () => {
    it('TODO pass through of backend output for now', async () => {
      const stubOutput: BackendOutput = {
        packageName: {
          constructVersion: '1.0.0',
          data: {
            someKey: 'someValue',
          },
        },
      };
      const outputRetrieval: OutputRetrievalStrategy = {
        fetchBackendOutput: mock.fn(async () => stubOutput),
      };

      const clientConfigGenerator = new DefaultClientConfigGenerator(
        outputRetrieval
      );
      const result = await clientConfigGenerator.generateClientConfig();
      assert.deepStrictEqual(result, stubOutput);
    });
  });
});
