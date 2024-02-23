import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';
import {
  ClientConfigGen2,
  clientConfigTypesV2,
} from '../client-config-types/client_config.js';
import { ModelIntrospectionSchemaAdapter } from '../model_introspection_schema_adapter.js';

// All categories client config contributors are included here to mildly enforce them using
// the same schema (version and other types)

/**
 * Translator for the Auth portion of ClientConfig
 */
export class AuthClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Auth portion of the ClientConfig
   */
  contribute = ({
    [authOutputKey]: authOutput,
  }: UnifiedBackendOutput): ClientConfigGen2 | Record<string, never> => {
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

    const authClientConfig: clientConfigTypesV2.Auth = {
      user_pool_id: authOutput.payload.userPoolId,
      aws_region: authOutput.payload
        .authRegion as clientConfigTypesV2.AwsRegion,
      user_pool_client_id: authOutput.payload.webClientId,
      identity_pool_id: authOutput.payload.identityPoolId,
    };

    parseAndAssignObject(
      authClientConfig,
      'mfa_methods',
      authOutput.payload.mfaTypes
    );
    parseAndAssignObject(
      authClientConfig,
      'standard_attributes',
      authOutput.payload.signupAttributes
    );
    parseAndAssignObject(
      authClientConfig,
      'username_attributes',
      authOutput.payload.usernameAttributes
    );
    parseAndAssignObject(
      authClientConfig,
      'user_verification_mechanisms',
      authOutput.payload.verificationMechanisms
    );

    if (authOutput.payload.mfaConfiguration) {
      authClientConfig.mfa_configuration = authOutput.payload
        .mfaConfiguration as clientConfigTypesV2.MfaConfiguration;
    }

    if (
      authOutput.payload.passwordPolicyMinLength ||
      authOutput.payload.passwordPolicyRequirements
    ) {
      const passwordPolicy: clientConfigTypesV2.PasswordPolicy = {};
      if (authOutput.payload.passwordPolicyMinLength) {
        passwordPolicy.min_length = Number.parseInt(
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
              passwordPolicy.require_numbers = true;
              break;
            case 'REQUIRES_LOWERCASE':
              passwordPolicy.require_lowercase = true;
              break;
            case 'REQUIRES_UPPERCASE':
              passwordPolicy.require_uppercase = true;
              break;
            case 'REQUIRES_SYMBOLS':
              passwordPolicy.require_symbols = true;
              break;
          }
        }
      }
      authClientConfig.password_policy = passwordPolicy;
    }

    if (authOutput.payload.socialProviders) {
      parseAndAssignObject(
        authClientConfig,
        'identity_providers',
        authOutput.payload.socialProviders
      );
    }

    if (authOutput.payload.oauthClientId) {
      if (authOutput.payload.oauthDomain) {
        authClientConfig.oauth_domain = authOutput.payload.oauthDomain;
      }
      parseAndAssignObject(
        authClientConfig,
        'oauth_scope',
        authOutput.payload.oauthScope
      );
      authClientConfig.oauth_redirect_sign_in =
        authOutput.payload.oauthRedirectSignIn;
      authClientConfig.oauth_redirect_sign_out =
        authOutput.payload.oauthRedirectSignOut;
      authClientConfig.oauth_response_type = authOutput.payload
        .oauthResponseType as clientConfigTypesV2.OauthResponseType;
    }
    return { auth: authClientConfig } as ClientConfigGen2;
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
    ClientConfigGen2 | Record<string, never>
  > => {
    if (graphqlOutput === undefined) {
      return {};
    }
    const config: clientConfigTypesV2.Data = {
      url: graphqlOutput.payload.awsAppsyncApiEndpoint,
      aws_region: graphqlOutput.payload
        .awsAppsyncRegion as clientConfigTypesV2.AwsRegion,
      api_key: graphqlOutput.payload.awsAppsyncApiKey,
      default_authorization_type:
        graphqlOutput.payload.awsAppsyncAuthenticationType,
      authorization_types: graphqlOutput.payload
        .awsAppsyncAdditionalAuthenticationTypes as unknown as clientConfigTypesV2.AuthorizationType[],
      // TBD
      // aws_appsync_conflictResolutionMode:
      //   graphqlOutput.payload.awsAppsyncConflictResolutionMode,
    };

    const modelIntrospection =
      await this.modelIntrospectionSchemaAdapter.getModelIntrospectionSchemaFromS3Uri(
        graphqlOutput.payload.amplifyApiModelSchemaS3Uri
      );

    if (modelIntrospection) {
      config.model_introspection = modelIntrospection;
    }

    return { data: config } as ClientConfigGen2;
  };
}
