import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import {
  ClientConfigVersion,
  ClientConfigVersionTemplateType,
} from './client-config-types/client_config.js';
import {
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';

// Because this function is acting as the DI container for this functionality, there is no way to test it without
// exposing the ClientConfigGeneratorFactory in the method signature. For this reason, we're turning off coverage for this file
// All this function should do is construct the factory and delegate to generateClientConfig()
// TODO this functionality should be tested in an E2E test once we've worked out a strategy to use real AWS credentials in tests
// https://github.com/aws-amplify/amplify-backend/issues/46
/* c8 ignore start */

/**
 * Main entry point for generating client config
 */
export const generateClientConfig = async <T extends ClientConfigVersion>(
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: DeployedBackendIdentifier,
  version: T
): Promise<ClientConfigVersionTemplateType<T>> => {
  const backendOutputClient = BackendOutputClientFactory.getInstance({
    credentials: credentialProvider,
  });
  return new ClientConfigGeneratorFactory(() =>
    backendOutputClient.getOutput(backendIdentifier)
  )
    .getInstance(credentialProvider, version)
    .generateClientConfig() as Promise<ClientConfigVersionTemplateType<T>>;
};
