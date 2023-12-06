import { AuthClientConfig } from './client-config-types/auth_client_config.js';
import { StorageClientConfig } from './client-config-types/storage_client_config.js';
import { PlatformClientConfig } from './client-config-types/platform_client_config.js';
import { GraphqlClientConfig } from './client-config-types/graphql_client_config.js';
import { getClientConfigPath } from './paths/index.js';
import { generateClientConfigToFile } from './generate_client_config_to_file.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { generateClientConfig } from './generate_client_config.js';
import {
  ClientConfig,
  ClientConfigFormat,
} from './client-config-types/client_config.js';

/**
 * This section makes minimal usage of public API, i.e. uses only required fields and parameters.
 */
const minimalApiUsage = async () => {
  const authClientConfig: AuthClientConfig = {
    aws_cognito_region: '',
  };
  const storageClientConfig: StorageClientConfig = {
    aws_user_files_s3_bucket: '',
    aws_user_files_s3_bucket_region: '',
  };
  const platformClientConfig: PlatformClientConfig = {
    aws_project_region: '',
  };
  const graphqlClientConfig: GraphqlClientConfig = {
    aws_appsync_authenticationType: '',
    aws_appsync_graphqlEndpoint: '',
    aws_appsync_region: '',
  };
  const clientConfig: ClientConfig = {};

  await getClientConfigPath();

  const credentialProvider: AwsCredentialIdentityProvider | undefined =
    undefined;
  const backendIdentifier: DeployedBackendIdentifier | undefined = undefined;
  if (credentialProvider && backendIdentifier) {
    await generateClientConfigToFile(credentialProvider, backendIdentifier);

    await generateClientConfig(credentialProvider, backendIdentifier);
  }

  let clientConfigFormat: ClientConfigFormat;
  clientConfigFormat = ClientConfigFormat.TS;
  clientConfigFormat = ClientConfigFormat.JSON;
  clientConfigFormat = ClientConfigFormat.DART;
  clientConfigFormat = ClientConfigFormat.MJS;
  clientConfigFormat = ClientConfigFormat.JSON_MOBILE;
};

/**
 * This section makes maximum usage of public API, i.e. uses all fields and parameters.
 */
const maximumApiUsage = async () => {
  const authClientConfig: AuthClientConfig = {
    aws_cognito_identity_pool_id: '',
    aws_cognito_mfa_configuration: '',
    aws_cognito_mfa_types: [''],
    aws_cognito_password_protection_settings: {
      passwordPolicyMinLength: 1,
      passwordPolicyCharacters: ['a'],
    },
    aws_cognito_region: '',
    aws_cognito_signup_attributes: [''],
    aws_cognito_username_attributes: [''],
    aws_cognito_verification_mechanisms: [''],
    aws_mandatory_sign_in: '',
    aws_user_pools_id: '',
    aws_user_pools_web_client_id: '',
  };

  const graphqlClientConfig: GraphqlClientConfig = {
    aws_appsync_authenticationType: '',
    aws_appsync_graphqlEndpoint: '',
    aws_appsync_region: '',
    aws_appsync_additionalAuthenticationTypes: '',
    aws_appsync_conflictResolutionMode: '',
    aws_appsync_apiKey: '',
    modelIntrospection: '',
  };

  const credentialProvider: AwsCredentialIdentityProvider | undefined =
    undefined;
  const backendIdentifier: DeployedBackendIdentifier | undefined = undefined;
  if (credentialProvider && backendIdentifier) {
    const outDir: string | undefined = undefined;
    const format: ClientConfigFormat | undefined = undefined;

    await generateClientConfigToFile(
      credentialProvider,
      backendIdentifier,
      outDir,
      format
    );

    await getClientConfigPath(outDir, format);
  }
};
