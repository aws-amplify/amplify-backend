import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
  customOutputKey,
  graphqlOutputKey,
  storageOutputKey,
} from '@aws-amplify/backend-output-schemas';
import {
  ClientConfig,
  ClientConfigVersions,
  clientConfigTypesV1,
} from '../client-config-types/client_config.js';
import { ModelIntrospectionSchemaAdapter } from '../model_introspection_schema_adapter.js';
import { AwsAppsyncAuthorizationType } from '../client-config-schema/client_config_v1.js';

// All categories client config contributors are included here to mildly enforce them using
// the same schema (version and other types)

/**
 * Translator for the version number of ClientConfig
 */
export class VersionContributor implements ClientConfigContributor {
  /**
   * Return the version of the schema types that this contributor uses
   */
  contribute = (): ClientConfig => {
    return { version: ClientConfigVersions.V1 };
  };
}

/**
 * Translator for the Auth portion of ClientConfig
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute = ({
    [authOutputKey]: authOutput,
  }: UnifiedBackendOutput): ClientConfig | Record<string, never> => {
    if (authOutput === undefined) {
      return {};
    }

    const parseAndAssignObject = <T>(
      obj: T,
      key: keyof T,
      value: string | undefined
    ) => {
      if (value == null) {
        return;
      }
      obj[key] = JSON.parse(value);
    };

    const authClientConfig: clientConfigTypesV1.AWSAmplifyBackendOutputs = {
      version: '1',
    };

    authClientConfig.auth = {
      user_pool_id: authOutput.payload.userPoolId,
      aws_region: authOutput.payload.authRegion,
      user_pool_client_id: authOutput.payload.webClientId,
      identity_pool_id: authOutput.payload.identityPoolId,
    };

    if (authOutput.payload.mfaTypes) {
      authClientConfig.auth.mfa_methods = JSON.parse(
        authOutput.payload.mfaTypes
      );
      parseAndAssignObject(
        authClientConfig.auth,
        'mfa_methods',
        authOutput.payload.mfaTypes
      );
    }
    parseAndAssignObject(
      authClientConfig.auth,
      'mfa_methods',
      authOutput.payload.mfaTypes
    );

    if (authOutput.payload.signupAttributes) {
      authClientConfig.auth.standard_attributes = {};
      const attributes = JSON.parse(
        authOutput.payload.signupAttributes
      ) as string[];
      for (const attribute of attributes) {
        authClientConfig.auth.standard_attributes[attribute] = {
          required: true,
        };
      }
    }

    parseAndAssignObject(
      authClientConfig.auth,
      'username_attributes',
      authOutput.payload.usernameAttributes
    );
    parseAndAssignObject(
      authClientConfig.auth,
      'user_verification_mechanisms',
      authOutput.payload.verificationMechanisms
    );

    if (authOutput.payload.mfaConfiguration) {
      authClientConfig.auth.mfa_configuration = authOutput.payload
        .mfaConfiguration as 'NONE' | 'OPTIONAL' | 'REQUIRED';
    }

    if (
      authOutput.payload.passwordPolicyMinLength ||
      authOutput.payload.passwordPolicyRequirements
    ) {
      authClientConfig.auth.password_policy = {};
      if (authOutput.payload.passwordPolicyMinLength) {
        authClientConfig.auth.password_policy.min_length = Number.parseInt(
          authOutput.payload.passwordPolicyMinLength
        );
      }
      if (authOutput.payload.passwordPolicyRequirements) {
        const requirements = JSON.parse(
          authOutput.payload.passwordPolicyRequirements
        ) as string[];
        for (const requirement of requirements) {
          switch (requirement) {
            case 'REQUIRES_NUMBERS':
              authClientConfig.auth.password_policy.require_numbers = true;
              break;
            case 'REQUIRES_LOWERCASE':
              authClientConfig.auth.password_policy.require_lowercase = true;
              break;
            case 'REQUIRES_UPPERCASE':
              authClientConfig.auth.password_policy.require_uppercase = true;
              break;
            case 'REQUIRES_SYMBOLS':
              authClientConfig.auth.password_policy.require_symbols = true;
              break;
          }
        }
      }
    }

    if (authOutput.payload.socialProviders) {
      parseAndAssignObject(
        authClientConfig.auth,
        'identity_providers',
        authOutput.payload.socialProviders
      );
    }

    if (authOutput.payload.oauthClientId) {
      if (authOutput.payload.oauthDomain) {
        authClientConfig.auth.oauth_domain = authOutput.payload.oauthDomain;
      }
      parseAndAssignObject(
        authClientConfig.auth,
        'oauth_scope',
        authOutput.payload.oauthScope
      );
      authClientConfig.auth.oauth_redirect_sign_in =
        authOutput.payload.oauthRedirectSignIn?.split(',');
      authClientConfig.auth.oauth_redirect_sign_out =
        authOutput.payload.oauthRedirectSignOut?.split(',');
      authClientConfig.auth.oauth_response_type = authOutput.payload
        .oauthResponseType as 'code' | 'token';
    }

    if (authOutput.payload.allowUnauthenticatedIdentities) {
      authClientConfig.auth.unauthenticated_identities_enabled =
        authOutput.payload.allowUnauthenticatedIdentities === 'true';
    }

    return authClientConfig;
  };
}

/**
 * Translator for the Data portion of ClientConfig
 */
export class DataClientConfigContributor implements ClientConfigContributor {
  /**
   * Constructor
   * @param modelIntrospectionSchemaAdapter the adapter to provide the model introspection schema from s3 uri
   */
  constructor(
    private readonly modelIntrospectionSchemaAdapter: ModelIntrospectionSchemaAdapter
  ) {}

  /**
   * Given some BackendOutput, contribute the Graphql API portion of the client config
   */
  contribute = async ({
    [graphqlOutputKey]: graphqlOutput,
  }: UnifiedBackendOutput): Promise<ClientConfig | Record<string, never>> => {
    if (graphqlOutput === undefined) {
      return {};
    }
    const config: clientConfigTypesV1.AWSAmplifyBackendOutputs = {
      version: '1',
    };

    config.data = {
      url: graphqlOutput.payload.awsAppsyncApiEndpoint,
      aws_region: graphqlOutput.payload.awsAppsyncRegion,
      api_key: graphqlOutput.payload.awsAppsyncApiKey,
      default_authorization_type:
        graphqlOutput.payload.awsAppsyncAuthenticationType,
      authorization_types:
        graphqlOutput.payload.awsAppsyncAdditionalAuthenticationTypes?.split(
          ','
        ) as AwsAppsyncAuthorizationType[],
    };

    const modelIntrospection =
      await this.modelIntrospectionSchemaAdapter.getModelIntrospectionSchemaFromS3Uri(
        graphqlOutput.payload.amplifyApiModelSchemaS3Uri
      );

    if (modelIntrospection) {
      config.data.model_introspection = modelIntrospection as {
        [k: string]: unknown;
      };
    }

    if (graphqlOutput.payload.awsAppsyncConflictResolutionMode) {
      config.data.conflict_resolution_mode = graphqlOutput.payload
        .awsAppsyncConflictResolutionMode as typeof config.data.conflict_resolution_mode;
    }

    return config;
  };
}

/**
 * Translator for the Storage portion of ClientConfig
 */
export class StorageClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Storage portion of the client config
   */
  contribute = ({
    [storageOutputKey]: storageOutput,
  }: UnifiedBackendOutput): ClientConfig | Record<string, never> => {
    if (storageOutput === undefined) {
      return {};
    }
    const config: clientConfigTypesV1.AWSAmplifyBackendOutputs = {
      version: '1',
    };

    config.storage = {
      aws_region: storageOutput.payload.storageRegion,
      bucket_name: storageOutput.payload.bucketName,
    };

    return config;
  };
}

/**
 * Translator for the Custom portion of ClientConfig
 */
export class CustomClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Custom portion of the ClientConfig
   */
  contribute = ({
    [customOutputKey]: customOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> => {
    if (customOutput === undefined) {
      return {};
    }

    return JSON.parse(customOutput.payload.customOutputs);
  };
}
