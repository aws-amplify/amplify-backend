import { describe, it } from 'node:test';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import assert from 'node:assert';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import { PassThroughMainStackNameResolver } from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { MainStackNameResolver } from '@aws-amplify/plugin-types';
import { UniqueBackendIdentifierMainStackNameResolver } from './stack-name-resolvers/unique_deployment_identifier_main_stack_name_resolver.js';
import { AppNameAndBranchMainStackNameResolver } from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';

/**
 * This type reaches into the internals of the ClientConfigGenerator implementation
 * to allow us to pull out the stackNameResolver that has been injected into the class.
 * Not great, but until we have test-e2e tests it gives us more confidence that the factory wired everything together properly
 */
type GeneratorInternalType = {
  outputRetrievalStrategy: {
    stackNameResolver: MainStackNameResolver;
  };
};

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
      assert.ok(
        (clientConfigGenerator as unknown as GeneratorInternalType)
          .outputRetrievalStrategy.stackNameResolver instanceof
          PassThroughMainStackNameResolver
      );
    });

    it('Creates client config generator for backendId and branch', () => {
      const generatorFactory = new ClientConfigGeneratorFactory(
        fromNodeProviderChain()
      );

      const clientConfigGenerator = generatorFactory.getInstance({
        backendId: 'testBackendId',
        branchName: 'testBranchName',
      });
      assert.ok(clientConfigGenerator instanceof UnifiedClientConfigGenerator);
      assert.ok(
        (clientConfigGenerator as unknown as GeneratorInternalType)
          .outputRetrievalStrategy.stackNameResolver instanceof
          UniqueBackendIdentifierMainStackNameResolver
      );
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
      assert.ok(
        (clientConfigGenerator as unknown as GeneratorInternalType)
          .outputRetrievalStrategy.stackNameResolver instanceof
          AppNameAndBranchMainStackNameResolver
      );
    });
  });
});
