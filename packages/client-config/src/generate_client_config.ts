import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { ClientConfig } from './client-config-types/client_config.js';
import { StackIdentifier } from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { AppNameAndBranchBackendIdentifier } from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
import { BackendOutputRetrievalStrategyFactory } from './backend_output_retrieval_strategy_factory.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyClient } from '@aws-sdk/client-amplify';

// Because this function is acting as the DI container for this functionality, there is no way to test it without
// exposing the ClientConfigGeneratorFactory in the method signature. For this reason, we're turning off coverage for this file
// All this function should do is construct the factory and delegate to generateClientConfig()
// TODO this functionality should be tested in an E2E test once we've worked out a strategy to use real AWS credentials in tests
// https://github.com/aws-amplify/samsara-cli/issues/46
/* c8 ignore start */

/**
 * Main entry point for generating client config
 */
export const generateClientConfig = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: BackendIdentifier
): Promise<ClientConfig> => {
  const backendOutputRetrievalStrategyFactory =
    new BackendOutputRetrievalStrategyFactory(
      new CloudFormationClient({ credentials: credentialProvider }),
      new AmplifyClient({ credentials: credentialProvider })
    );
  return new ClientConfigGeneratorFactory(backendOutputRetrievalStrategyFactory)
    .getInstance(backendIdentifier)
    .generateClientConfig();
};

export type BackendIdentifier =
  | UniqueBackendIdentifier
  | StackIdentifier
  | AppNameAndBranchBackendIdentifier;
