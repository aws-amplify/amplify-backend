import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ClientConfigConverter } from './client_config_converter.js';
import { ClientConfigMobile } from '../client-config-types/mobile/client_config_mobile_types.js';
import { ClientConfig } from '../client-config-types/client_config.js';

void describe('client config converter', () => {
  const testPackageName = 'test_package_name';
  const testPackageVersion = 'test_package_version;';
  const converter = new ClientConfigConverter(
    testPackageName,
    testPackageVersion
  );
  const expectedUserAgent = `${testPackageName}/${testPackageVersion}`;

  void it('converts auth only config', () => {
    const clientConfig: ClientConfig = {
      aws_cognito_region: 'test_cognito_region',
      aws_user_pools_id: 'test_user_pool_id',
      aws_user_pools_web_client_id: 'test_user_pool_app_client_id',
      aws_cognito_identity_pool_id: 'test_identity_pool_id',
      aws_cognito_signup_attributes: [
        'test_signup_attribute_1',
        'test_signup_attribute_2',
      ],
      aws_cognito_username_attributes: [
        'test_username_attribute_1',
        'test_username_attribute_2',
      ],
      aws_cognito_password_protection_settings: {
        passwordPolicyMinLength: 1234,
        passwordPolicyCharacters: ['a', 'b', 'c'],
      },
      aws_cognito_verification_mechanisms: [
        'test_verification_mechanism_1',
        'test_verification_mechanism_2',
      ],
      aws_cognito_mfa_configuration: 'test_mfa_configuration',
      aws_cognito_mfa_types: ['test_mfa_type_1', 'test_mfa_type_2'],
    };
    const expectedMobileConfig: ClientConfigMobile = {
      UserAgent: expectedUserAgent,
      Version: '1.0',
      auth: {
        plugins: {
          awsCognitoAuthPlugin: {
            UserAgent: expectedUserAgent,
            Version: '1.0',
            CognitoUserPool: {
              Default: {
                PoolId: 'test_user_pool_id',
                AppClientId: 'test_user_pool_app_client_id',
                Region: 'test_cognito_region',
              },
            },
            CredentialsProvider: {
              CognitoIdentity: {
                Default: {
                  PoolId: 'test_identity_pool_id',
                  Region: 'test_cognito_region',
                },
              },
            },
            Auth: {
              Default: {
                authenticationFlowType: 'USER_SRP_AUTH',
                mfaConfiguration: 'test_mfa_configuration',
                mfaTypes: ['test_mfa_type_1', 'test_mfa_type_2'],
                signupAttributes: [
                  'test_signup_attribute_1',
                  'test_signup_attribute_2',
                ],
                usernameAttributes: [
                  'test_username_attribute_1',
                  'test_username_attribute_2',
                ],
                passwordProtectionSettings: {
                  passwordPolicyMinLength: 1234,
                  passwordPolicyCharacters: ['a', 'b', 'c'],
                },
                verificationMechanisms: [
                  'test_verification_mechanism_1',
                  'test_verification_mechanism_2',
                ],
              },
            },
          },
        },
      },
    };

    const actualMobileConfig = converter.convertToMobileConfig(clientConfig);

    assert.deepStrictEqual(expectedMobileConfig, actualMobileConfig);
  });

  void it('converts data only config', () => {
    const clientConfig: ClientConfig = {
      aws_appsync_region: 'test_app_sync_region',
      aws_appsync_graphqlEndpoint: 'https://test_api_endpoint.amazon.com',
      aws_appsync_apiKey: 'test_api_key',
      aws_appsync_authenticationType: 'API_KEY',
    };
    const expectedMobileConfig: ClientConfigMobile = {
      UserAgent: expectedUserAgent,
      Version: '1.0',
      api: {
        plugins: {
          awsAPIPlugin: {
            data: {
              endpointType: 'GraphQL',
              endpoint: 'https://test_api_endpoint.amazon.com',
              region: 'test_app_sync_region',
              authorizationType: 'API_KEY',
              apiKey: 'test_api_key',
            },
          },
        },
      },
    };

    const actualMobileConfig = converter.convertToMobileConfig(clientConfig);

    assert.deepStrictEqual(expectedMobileConfig, actualMobileConfig);
  });

  void it('converts auth with data config', () => {
    const clientConfig: ClientConfig = {
      aws_cognito_region: 'test_cognito_region',
      aws_user_pools_id: 'test_user_pool_id',
      aws_cognito_identity_pool_id: 'test_identity_pool_id',
      aws_user_pools_web_client_id: 'test_user_pool_app_client_id',
      aws_appsync_region: 'test_app_sync_region',
      aws_appsync_graphqlEndpoint: 'https://test_api_endpoint.amazon.com',
      aws_appsync_apiKey: 'test_api_key',
      aws_appsync_authenticationType: 'API_KEY',
      aws_appsync_additionalAuthenticationTypes:
        'AMAZON_COGNITO_USER_POOLS,AWS_IAM',
    };
    const expectedMobileConfig: ClientConfigMobile = {
      UserAgent: expectedUserAgent,
      Version: '1.0',
      auth: {
        plugins: {
          awsCognitoAuthPlugin: {
            UserAgent: expectedUserAgent,
            Version: '1.0',
            CognitoUserPool: {
              Default: {
                PoolId: 'test_user_pool_id',
                AppClientId: 'test_user_pool_app_client_id',
                Region: 'test_cognito_region',
              },
            },
            CredentialsProvider: {
              CognitoIdentity: {
                Default: {
                  PoolId: 'test_identity_pool_id',
                  Region: 'test_cognito_region',
                },
              },
            },
            Auth: {
              Default: {
                authenticationFlowType: 'USER_SRP_AUTH',
                mfaConfiguration: undefined,
                mfaTypes: undefined,
                signupAttributes: [],
                usernameAttributes: [],
                passwordProtectionSettings: {
                  passwordPolicyCharacters: [],
                  passwordPolicyMinLength: undefined,
                },
                verificationMechanisms: [],
              },
            },
            AppSync: {
              Default: {
                ApiUrl: 'https://test_api_endpoint.amazon.com',
                Region: 'test_app_sync_region',
                AuthMode: 'API_KEY',
                ApiKey: 'test_api_key',
                ClientDatabasePrefix: 'data_API_KEY',
              },
              data_AWS_IAM: {
                ApiUrl: 'https://test_api_endpoint.amazon.com',
                Region: 'test_app_sync_region',
                AuthMode: 'API_KEY',
                ApiKey: 'test_api_key',
                ClientDatabasePrefix: 'data_AWS_IAM',
              },
              data_AMAZON_COGNITO_USER_POOLS: {
                ApiUrl: 'https://test_api_endpoint.amazon.com',
                Region: 'test_app_sync_region',
                AuthMode: 'API_KEY',
                ApiKey: 'test_api_key',
                ClientDatabasePrefix: 'data_AMAZON_COGNITO_USER_POOLS',
              },
            },
          },
        },
      },
      api: {
        plugins: {
          awsAPIPlugin: {
            data: {
              endpointType: 'GraphQL',
              endpoint: 'https://test_api_endpoint.amazon.com',
              region: 'test_app_sync_region',
              authorizationType: 'API_KEY',
              apiKey: 'test_api_key',
            },
          },
        },
      },
    };

    const actualMobileConfig = converter.convertToMobileConfig(clientConfig);

    assert.deepStrictEqual(expectedMobileConfig, actualMobileConfig);
  });
});
