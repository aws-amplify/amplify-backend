import { ProjectEnvironmentIdentifier } from '@aws-amplify/primitives';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { ClientConfigGeneratorFactory } from './client_config_generator_factory.js';

export type StackIdentifier = {
  readonly stackName: string;
};

/**
 * Main entry point for generating client config
 */
export const generateClientConfig = async (
  credentialProvider: AwsCredentialIdentityProvider,
  backendIdentifier: StackIdentifier | ProjectEnvironmentIdentifier
) => {
  const clientConfigGeneratorFactory = new ClientConfigGeneratorFactory(
    credentialProvider
  );
  const clientConfigGenerator =
    'stackName' in backendIdentifier
      ? clientConfigGeneratorFactory.fromStackName(backendIdentifier.stackName)
      : clientConfigGeneratorFactory.fromProjectEnvironment(backendIdentifier);
  await clientConfigGenerator.generateClientConfig();
};
