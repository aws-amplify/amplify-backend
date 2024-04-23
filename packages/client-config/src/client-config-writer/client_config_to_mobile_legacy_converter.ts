import { ClientConfigLegacy } from '../client-config-types/client_config.js';
import {
  ClientConfigMobile,
  ClientConfigMobileApi,
  ClientConfigMobileAuth,
  ClientConfigMobileGeo,
} from '../client-config-types/mobile/client_config_mobile_types.js';

/**
 * Converts client config to a different shapes needed by mobile libraries for Gen1 format.
 */
export class ClientConfigMobileConverter {
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
  convertToMobileConfig = (
    clientConfig: ClientConfigLegacy
  ): ClientConfigMobile => {
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
        let defaultClientDatabasePrefix = undefined;
        if (clientConfig.aws_appsync_authenticationType) {
          defaultClientDatabasePrefix = `data_${clientConfig.aws_appsync_authenticationType}`;
        }
        mobileConfig.auth.plugins.awsCognitoAuthPlugin.AppSync = {
          Default: {
            ApiUrl: clientConfig.aws_appsync_graphqlEndpoint,
            Region: clientConfig.aws_appsync_region,
            AuthMode: clientConfig.aws_appsync_authenticationType,
            ApiKey: clientConfig.aws_appsync_apiKey,
            ClientDatabasePrefix: defaultClientDatabasePrefix,
          },
        };
        if (clientConfig.aws_appsync_additionalAuthenticationTypes) {
          for (const additionalAuthenticationType of clientConfig.aws_appsync_additionalAuthenticationTypes.split(
            ','
          )) {
            mobileConfig.auth.plugins.awsCognitoAuthPlugin.AppSync[
              `data_${additionalAuthenticationType}`
            ] = {
              ApiUrl: clientConfig.aws_appsync_graphqlEndpoint,
              Region: clientConfig.aws_appsync_region,
              AuthMode: clientConfig.aws_appsync_authenticationType,
              ApiKey: clientConfig.aws_appsync_apiKey,
              ClientDatabasePrefix: `data_${additionalAuthenticationType}`,
            };
          }
        }
      }
    }

    if (clientConfig.geo) {
      const geoConfig: ClientConfigMobileGeo = {
        plugins: {
          awsLocationGeoPlugin: {
            region: clientConfig.geo.amazon_location_service.region,
          },
        },
      };

      const maps = clientConfig.geo.amazon_location_service.maps;
      if (maps) {
        geoConfig.plugins.awsLocationGeoPlugin.maps = maps;
      }
      const searchIndices =
        clientConfig.geo.amazon_location_service.search_indices;
      if (searchIndices) {
        geoConfig.plugins.awsLocationGeoPlugin.searchIndices = searchIndices;
      }

      mobileConfig.geo = geoConfig;
    }

    if (clientConfig.Analytics) {
      mobileConfig.analytics = {
        plugins: {
          awsPinpointAnalyticsPlugin: {
            pinpointAnalytics: {
              region: clientConfig.Analytics.Pinpoint.region,
              appId: clientConfig.Analytics.Pinpoint.appId,
            },
            pinpointTargeting: {
              region: clientConfig.Analytics.Pinpoint.region,
            },
          },
        },
      };
    }

    if (clientConfig.Notifications) {
      mobileConfig.notifications = {
        plugins: {},
      };
      if (clientConfig.Notifications.SMS) {
        mobileConfig.notifications.plugins.awsPinpointSmsNotificationsPlugin =
          clientConfig.Notifications.SMS.AWSPinpoint;
      }
      if (clientConfig.Notifications.EMAIL) {
        mobileConfig.notifications.plugins.awsPinpointEmailNotificationsPlugin =
          clientConfig.Notifications.EMAIL.AWSPinpoint;
      }
      if (clientConfig.Notifications.InAppMessaging) {
        mobileConfig.notifications.plugins.awsPinpointInAppMessagingNotificationsPlugin =
          clientConfig.Notifications.InAppMessaging.AWSPinpoint;
      }
      if (clientConfig.Notifications.Push) {
        mobileConfig.notifications.plugins.awsPinpointPushNotificationsPlugin =
          clientConfig.Notifications.Push.AWSPinpoint;
      }
    }

    if (clientConfig.aws_user_files_s3_bucket) {
      mobileConfig.storage = {
        plugins: {
          awsS3StoragePlugin: {
            bucket: clientConfig.aws_user_files_s3_bucket,
            region: clientConfig.aws_user_files_s3_bucket_region,
          },
        },
      };
    }

    return mobileConfig;
  };
}
