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
   * Converts client config to a shape consumable by mobile libraries.
   */
  convertToMobileConfig = (clientConfig: ClientConfig): ClientConfigMobile => {
    const mobileConfig: ClientConfigMobile = {
      UserAgent: 'aws-amplify-cli/2.0',
      Version: '1.0',
    };
    if (clientConfig.aws_user_pools_id) {
      const authConfig: ClientConfigMobileAuth = {
        plugins: {
          awsCognitoAuthPlugin: {
            UserAgent: 'aws-amplify-cli/2.0',
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
                  PoolId: clientConfig.aws_user_pools_id,
                  Region: clientConfig.aws_cognito_region,
                },
              },
            },
            Auth: {
              Default: {
                authenticationFlowType: 'USER_SRP_AUTH',
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
              apiKey: clientConfig.aws_appsync_region,
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
            ApiKey: clientConfig.aws_appsync_region,
          },
        };
      }
    }
    return mobileConfig;
  };
}
