import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';
import { BackendIdentifier } from '@aws-amplify/backend-types';

/**
 * Main entry point for generating client config
 */
export const generateClientConfig = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: BackendIdentifier
) => {
  const clientConfigGeneratorFactory = new ClientConfigGeneratorFactory(
    credentialProvider
  );
  const clientConfigGenerator =
    'stackName' in backendIdentifier
      ? clientConfigGeneratorFactory.fromStackIdentifier(backendIdentifier)
      : clientConfigGeneratorFactory.fromProjectEnvironmentIdentifier(
          backendIdentifier
        );
  await clientConfigGenerator.generateClientConfig();
};
