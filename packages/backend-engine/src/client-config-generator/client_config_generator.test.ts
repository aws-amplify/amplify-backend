import { describe, it, mock } from 'node:test';
import {
  BackendOutputEntry,
  BackendOutputRetrievalStrategy,
} from '@aws-amplify/plugin-types';
import { DefaultClientConfigGenerator } from './client_config_generator.js';
import assert from 'node:assert';

describe('ClientConfigGenerator', () => {
  describe('generateClientConfig', () => {
    it('TODO pass through of backend output for now', async () => {
      const stubOutput: BackendOutputEntry[] = [
        {
          schemaIdentifier: {
            schemaName: 'TestSchema',
            schemaVersion: 1,
          },
          payload: {
            someKey: 'someValue',
          },
        },
      ];
      const outputRetrieval: BackendOutputRetrievalStrategy = {
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
