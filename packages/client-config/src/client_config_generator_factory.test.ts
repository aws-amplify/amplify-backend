import { describe, it } from 'node:test';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import assert from 'node:assert';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';

describe('ClientConfigGeneratorFactory', () => {
  describe('getInstance', () => {
    it('Creates client config generator for stack identifier', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator = generatorFactory.getInstance({
        stackName: 'testStackName',
      });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
    });

    it('Creates client config generator for appId and branch', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator = generatorFactory.getInstance({
        appId: 'testAppId',
        branchName: 'testBranchName',
      });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
    });

    it('Creates client config generator for appName and branch', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator = generatorFactory.getInstance({
        appName: 'testAppName',
        branchName: 'testBranchName',
      });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
    });
  });
});
