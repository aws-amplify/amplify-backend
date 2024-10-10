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
  ClientConfigVersionOption,
  clientConfigTypesV1,
  clientConfigTypesV1_1,
  clientConfigTypesV1_2,
  clientConfigTypesV1_3,
} from '../client-config-types/client_config.js';
import { ModelIntrospectionSchemaAdapter } from '../model_introspection_schema_adapter.js';
import { AwsAppsyncAuthorizationType } from '../client-config-schema/client_config_v1.1.js';
import { AmplifyStorageAccessRule } from '../client-config-schema/client_config_v1.2.js';

// All categories client config contributors are included here to mildly enforce them using
// the same schema (version and other types)

/**
 * Translator for the version number of ClientConfig of V1.3
 */
export class VersionContributor implements ClientConfigContributor {
  /**
   * Return the version of the schema types that this contributor uses
   */
  contribute = (): ClientConfig => {
    return { version: ClientConfigVersionOption.V1_3 };
  };
}

/**
 * Translator for the version number of ClientConfig of V1.2
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class VersionContributorV1_2 implements ClientConfigContributor {
  /**
   * Return the version of the schema types that this contributor uses
   */
  contribute = (): ClientConfig => {
    return { version: ClientConfigVersionOption.V1_2 };
  };
}

/**
 * Translator for the version number of ClientConfig of V1.1
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class VersionContributorV1_1 implements ClientConfigContributor {
  /**
   * Return the version of the schema types that this contributor uses
   */
  contribute = (): ClientConfig => {
    return { version: ClientConfigVersionOption.V1_1 };
  };
}

/**
 * Translator for the version number of ClientConfig of V1.0
 */
export class VersionContributorV1 implements ClientConfigContributor {
  /**
   * Return the version of the schema types that this contributor uses
   */
  contribute = (): ClientConfig => {
    return { version: ClientConfigVersionOption.V1 };
  };
}

/**
 * Translator for the Auth portion of ClientConfig in V1.3
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute = ({
    [authOutputKey]: authOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> | Record<string, never> => {
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

    const authClientConfig: Partial<clientConfigTypesV1_3.AWSAmplifyBackendOutputs> =
      {};

    authClientConfig.auth = {
      user_pool_id: authOutput.payload.userPoolId,
      aws_region: authOutput.payload.authRegion,
      user_pool_client_id: authOutput.payload.webClientId,
    };

    if (authOutput.payload.identityPoolId) {
      authClientConfig.auth.identity_pool_id =
        authOutput.payload.identityPoolId;
    }

    parseAndAssignObject(
      authClientConfig.auth,
      'mfa_methods',
      authOutput.payload.mfaTypes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'standard_required_attributes',
      authOutput.payload.signupAttributes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'username_attributes',
      authOutput.payload.usernameAttributes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'user_verification_types',
      authOutput.payload.verificationMechanisms
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'groups',
      authOutput.payload.groups
    );

    if (authOutput.payload.mfaConfiguration) {
      switch (authOutput.payload.mfaConfiguration) {
        case 'OFF': {
          authClientConfig.auth.mfa_configuration = 'NONE';
          break;
        }
        case 'OPTIONAL': {
          authClientConfig.auth.mfa_configuration = 'OPTIONAL';
          break;
        }
        case 'ON': {
          authClientConfig.auth.mfa_configuration = 'REQUIRED';
        }
      }
    }

    if (
      authOutput.payload.passwordPolicyMinLength ||
      authOutput.payload.passwordPolicyRequirements
    ) {
      authClientConfig.auth.password_policy = {
        min_length: 8, // This is the default that is matching what construct defines.
        // Values below are set to false instead of being undefined as libraries expect defined values.
        // They are overridden below with construct outputs (default or not) if applicable.
        require_lowercase: false,
        require_numbers: false,
        require_symbols: false,
        require_uppercase: false,
      };
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

    // OAuth settings are present if both oauthRedirectSignIn and oauthRedirectSignOut are.
    if (
      authOutput.payload.oauthRedirectSignIn &&
      authOutput.payload.oauthRedirectSignOut
    ) {
      let socialProviders = authOutput.payload.socialProviders
        ? JSON.parse(authOutput.payload.socialProviders)
        : [];
      if (Array.isArray(socialProviders)) {
        socialProviders = socialProviders.filter(this.isValidIdentityProvider);
      }
      authClientConfig.auth.oauth = {
        identity_providers: socialProviders,
        redirect_sign_in_uri: authOutput.payload.oauthRedirectSignIn.split(','),
        redirect_sign_out_uri:
          authOutput.payload.oauthRedirectSignOut.split(','),
        response_type: authOutput.payload.oauthResponseType as 'code' | 'token',
        scopes: authOutput.payload.oauthScope
          ? JSON.parse(authOutput.payload.oauthScope)
          : [],
        domain: authOutput.payload.oauthCognitoDomain ?? '',
      };
    }

    if (authOutput.payload.allowUnauthenticatedIdentities) {
      authClientConfig.auth.unauthenticated_identities_enabled =
        authOutput.payload.allowUnauthenticatedIdentities === 'true';
    }

    return authClientConfig;
  };

  // Define a type guard function to check if a value is a valid IdentityProvider
  isValidIdentityProvider = (identityProvider: string): boolean => {
    return [
      'GOOGLE',
      'FACEBOOK',
      'LOGIN_WITH_AMAZON',
      'SIGN_IN_WITH_APPLE',
    ].includes(identityProvider);
  };
}

/**
 * Translator for the Auth portion of ClientConfig in V1.2
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class AuthClientConfigContributorV1_1
  implements ClientConfigContributor
{
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute = ({
    [authOutputKey]: authOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> | Record<string, never> => {
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

    const authClientConfig: Partial<clientConfigTypesV1_2.AWSAmplifyBackendOutputs> =
      {};

    authClientConfig.auth = {
      user_pool_id: authOutput.payload.userPoolId,
      aws_region: authOutput.payload.authRegion,
      user_pool_client_id: authOutput.payload.webClientId,
    };

    if (authOutput.payload.identityPoolId) {
      authClientConfig.auth.identity_pool_id =
        authOutput.payload.identityPoolId;
    }

    parseAndAssignObject(
      authClientConfig.auth,
      'mfa_methods',
      authOutput.payload.mfaTypes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'standard_required_attributes',
      authOutput.payload.signupAttributes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'username_attributes',
      authOutput.payload.usernameAttributes
    );

    parseAndAssignObject(
      authClientConfig.auth,
      'user_verification_types',
      authOutput.payload.verificationMechanisms
    );

    if (authOutput.payload.mfaConfiguration) {
      switch (authOutput.payload.mfaConfiguration) {
        case 'OFF': {
          authClientConfig.auth.mfa_configuration = 'NONE';
          break;
        }
        case 'OPTIONAL': {
          authClientConfig.auth.mfa_configuration = 'OPTIONAL';
          break;
        }
        case 'ON': {
          authClientConfig.auth.mfa_configuration = 'REQUIRED';
        }
      }
    }

    if (
      authOutput.payload.passwordPolicyMinLength ||
      authOutput.payload.passwordPolicyRequirements
    ) {
      authClientConfig.auth.password_policy = {
        min_length: 8, // This is the default that is matching what construct defines.
        // Values below are set to false instead of being undefined as libraries expect defined values.
        // They are overridden below with construct outputs (default or not) if applicable.
        require_lowercase: false,
        require_numbers: false,
        require_symbols: false,
        require_uppercase: false,
      };
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

    // OAuth settings are present if both oauthRedirectSignIn and oauthRedirectSignOut are.
    if (
      authOutput.payload.oauthRedirectSignIn &&
      authOutput.payload.oauthRedirectSignOut
    ) {
      let socialProviders = authOutput.payload.socialProviders
        ? JSON.parse(authOutput.payload.socialProviders)
        : [];
      if (Array.isArray(socialProviders)) {
        socialProviders = socialProviders.filter(this.isValidIdentityProvider);
      }
      authClientConfig.auth.oauth = {
        identity_providers: socialProviders,
        redirect_sign_in_uri: authOutput.payload.oauthRedirectSignIn.split(','),
        redirect_sign_out_uri:
          authOutput.payload.oauthRedirectSignOut.split(','),
        response_type: authOutput.payload.oauthResponseType as 'code' | 'token',
        scopes: authOutput.payload.oauthScope
          ? JSON.parse(authOutput.payload.oauthScope)
          : [],
        domain: authOutput.payload.oauthCognitoDomain ?? '',
      };
    }

    if (authOutput.payload.allowUnauthenticatedIdentities) {
      authClientConfig.auth.unauthenticated_identities_enabled =
        authOutput.payload.allowUnauthenticatedIdentities === 'true';
    }

    return authClientConfig;
  };

  // Define a type guard function to check if a value is a valid IdentityProvider
  isValidIdentityProvider = (identityProvider: string): boolean => {
    return [
      'GOOGLE',
      'FACEBOOK',
      'LOGIN_WITH_AMAZON',
      'SIGN_IN_WITH_APPLE',
    ].includes(identityProvider);
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
  }: UnifiedBackendOutput): Promise<
    Partial<ClientConfig> | Record<string, never>
  > => {
    if (graphqlOutput === undefined) {
      return {};
    }
    const config: Partial<clientConfigTypesV1_1.AWSAmplifyBackendOutputs> = {};

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

    return config;
  };
}

/**
 * Translator for the Storage portion of ClientConfig in V1.2
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class StorageClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Storage portion of the client config
   */
  contribute = ({
    [storageOutputKey]: storageOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> | Record<string, never> => {
    if (storageOutput === undefined) {
      return {};
    }
    const config: Partial<clientConfigTypesV1_2.AWSAmplifyBackendOutputs> = {};
    const bucketsStringArray = JSON.parse(
      storageOutput.payload.buckets ?? '[]'
    );
    config.storage = {
      aws_region: storageOutput.payload.storageRegion,
      bucket_name: storageOutput.payload.bucketName,
      buckets: bucketsStringArray
        .map((b: string) => JSON.parse(b))
        .map(
          ({
            name,
            bucketName,
            storageRegion,
            paths,
          }: {
            name: string;
            bucketName: string;
            storageRegion: string;
            paths: Record<string, AmplifyStorageAccessRule>;
          }) => ({
            name,
            bucket_name: bucketName,
            aws_region: storageRegion,
            paths,
          })
        ),
    };

    return config;
  };
}

/**
 * Translator for the Storage portion of ClientConfig in V1.1
 */
// eslint-disable-next-line @typescript-eslint/naming-convention
export class StorageClientConfigContributorV1_1
  implements ClientConfigContributor
{
  /**
   * Given some BackendOutput, contribute the Storage portion of the client config
   */
  contribute = ({
    [storageOutputKey]: storageOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> | Record<string, never> => {
    if (storageOutput === undefined) {
      return {};
    }
    const config: Partial<clientConfigTypesV1_1.AWSAmplifyBackendOutputs> = {};
    const bucketsStringArray = JSON.parse(
      storageOutput.payload.buckets ?? '[]'
    );
    config.storage = {
      aws_region: storageOutput.payload.storageRegion,
      bucket_name: storageOutput.payload.bucketName,
      buckets: bucketsStringArray
        .map((b: string) => JSON.parse(b))
        .map(
          ({
            name,
            bucketName,
            storageRegion,
          }: {
            name: string;
            bucketName: string;
            storageRegion: string;
          }) => ({
            name,
            bucket_name: bucketName,
            aws_region: storageRegion,
          })
        ),
    };

    return config;
  };
}

/**
 * Translator for the Storage portion of ClientConfig in V1
 */
export class StorageClientConfigContributorV1
  implements ClientConfigContributor
{
  /**
   * Given some BackendOutput, contribute the Storage portion of the client config
   */
  contribute = ({
    [storageOutputKey]: storageOutput,
  }: UnifiedBackendOutput): Partial<ClientConfig> | Record<string, never> => {
    if (storageOutput === undefined) {
      return {};
    }
    const config: Partial<clientConfigTypesV1.AWSAmplifyBackendOutputs> = {};

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
