import { ClientConfig } from '../client-config-types/client_config.js';
import {
  ClientConfigMobile,
  ClientConfigMobileApi,
  ClientConfigMobileAuth,
} from '../client-config-types/mobile/client_config_mobile_types.js';

/**
 * Converts client config to a different shapes.
 */
export class ClientConfigConverter {
  /**
   * Creates client config converter
   */
  constructor(
    private readonly packageName: string,
    private readonly packageVersion: string
  ) {}
  /**
   * Converts client config to a shape consumable by mobile libraries.
   */
  convertToMobileConfig = (clientConfig: ClientConfig): ClientConfigMobile => {
    const userAgent = `${this.packageName}/${this.packageVersion}`;

    const mobileConfig: ClientConfigMobile = {
      UserAgent: userAgent,
      Version: '1.0',
    };
    if (clientConfig.aws_user_pools_id) {
      const authConfig: ClientConfigMobileAuth = {
        plugins: {
          awsCognitoAuthPlugin: {
            UserAgent: userAgent,
            Version: '1.0',
            CognitoUserPool: {
              Default: {
                PoolId: clientConfig.aws_user_pools_id,
                AppClientId: clientConfig.aws_user_pools_web_client_id,
                Region: clientConfig.aws_cognito_region,
              },
            },
            CredentialsProvider: {
              CognitoIdentity: {
                Default: {
                  PoolId: clientConfig.aws_cognito_identity_pool_id,
                  Region: clientConfig.aws_cognito_region,
                },
              },
            },
            Auth: {
              Default: {
                authenticationFlowType: 'USER_SRP_AUTH',
                mfaConfiguration: clientConfig.aws_cognito_mfa_configuration,
                mfaTypes: clientConfig.aws_cognito_mfa_types,
                passwordProtectionSettings: {
                  passwordPolicyMinLength:
                    clientConfig.aws_cognito_password_protection_settings
                      ?.passwordPolicyMinLength,
                  passwordPolicyCharacters:
                    clientConfig.aws_cognito_password_protection_settings
                      ?.passwordPolicyCharacters ?? [],
                },
                signupAttributes:
                  clientConfig.aws_cognito_signup_attributes ?? [],
                usernameAttributes:
                  clientConfig.aws_cognito_username_attributes ?? [],
                verificationMechanisms:
                  clientConfig.aws_cognito_verification_mechanisms ?? [],
              },
            },
          },
        },
      };
      mobileConfig.auth = authConfig;
    }

    if (clientConfig.aws_appsync_graphqlEndpoint) {
      const apiConfig: ClientConfigMobileApi = {
        plugins: {
          awsAPIPlugin: {
            data: {
              endpointType: 'GraphQL',
              endpoint: clientConfig.aws_appsync_graphqlEndpoint,
              region: clientConfig.aws_appsync_region,
              authorizationType: clientConfig.aws_appsync_authenticationType,
              apiKey: clientConfig.aws_appsync_apiKey,
            },
          },
        },
      };
      mobileConfig.api = apiConfig;

      if (mobileConfig.auth) {
        mobileConfig.auth.plugins.awsCognitoAuthPlugin.AppSync = {
          Default: {
            ApiUrl: clientConfig.aws_appsync_graphqlEndpoint,
            Region: clientConfig.aws_appsync_region,
            AuthMode: clientConfig.aws_appsync_authenticationType,
            ApiKey: clientConfig.aws_appsync_apiKey,
          },
        };
      }
    }
    return mobileConfig;
  };
}
