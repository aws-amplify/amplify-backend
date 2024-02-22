import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';
import {
  Gen2ClientConfig,
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
  }: UnifiedBackendOutput): Gen2ClientConfig | Record<string, never> => {
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
    // TBD
    // if (authOutput.payload.allowUnauthenticatedIdentities !== undefined) {
    //   authClientConfig.allowUnauthenticatedIdentities =
    //     authOutput.payload.allowUnauthenticatedIdentities;
    // }

    parseAndAssignObject(
      authClientConfig,
      'mfa_methods',
      authOutput.payload.mfaTypes
    );
    parseAndAssignObject(
      authClientConfig,
      'user_sign_up_attributes',
      authOutput.payload.signupAttributes
    );
    parseAndAssignObject(
      authClientConfig,
      'user_username_attributes',
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

    if (authOutput.payload.passwordPolicyMinLength) {
      (authClientConfig.password_policy_min_length = Number.parseInt(
        authOutput.payload.passwordPolicyMinLength
      )),
        parseAndAssignObject(
          authClientConfig,
          'password_policy_characters',
          authOutput.payload.passwordPolicyRequirements
        );
    }

    if (authOutput.payload.socialProviders) {
      parseAndAssignObject(
        authClientConfig,
        'social_providers',
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
      // TBD
      // authClientConfig.oauth.clientId = authOutput.payload.oauthClientId;
      authClientConfig.oauth_response_type = authOutput.payload
        .oauthResponseType as clientConfigTypesV2.OauthResponseType;
    }
    return { auth: authClientConfig } as Gen2ClientConfig;
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
    Gen2ClientConfig | Record<string, never>
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

    return { data: config } as Gen2ClientConfig;
  };
}
