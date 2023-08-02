import { describe, it } from 'node:test';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import assert from 'node:assert';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';

describe('ClientConfigGeneratorFactory', () => {
  describe('fromStackIdentifier', () => {
    it('Creates client config generator for stack', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator = generatorFactory.fromStackIdentifier({
        stackName: 'testStackName',
      });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
    });

    it('Creates client config generator for project environment', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator =
        generatorFactory.fromUniqueBackendIdentifier({
          appName: 'testAppName',
          branchName: 'testBranchName',
          disambiguator: '1234',
        });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
    });
  });
});
