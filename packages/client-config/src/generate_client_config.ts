import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import {
  ClientConfigVersion,
  ClientConfigVersionTemplateType,
} from './client-config-types/client_config.js';
import {
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import { GraphqlModelsFetchOptions } from '@aws-amplify/model-generator';

export type ClientConfigGeneratorFactoryOptions = GraphqlModelsFetchOptions;

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
  options: ClientConfigGeneratorFactoryOptions,
  backendIdentifier: DeployedBackendIdentifier,
  version: T
): Promise<ClientConfigVersionTemplateType<T>> => {
  const backendOutputClient = BackendOutputClientFactory.getInstance(options);
  return new ClientConfigGeneratorFactory(() =>
    backendOutputClient.getOutput(backendIdentifier)
  )
    .getInstance(options, version)
    .generateClientConfig() as Promise<ClientConfigVersionTemplateType<T>>;
};
