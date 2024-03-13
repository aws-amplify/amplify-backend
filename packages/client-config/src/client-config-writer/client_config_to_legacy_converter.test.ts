import { describe, it } from 'node:test';
import { ClientConfigLegacyConverter } from './client_config_to_legacy_converter.js';
import assert from 'node:assert';
import {
  AnalyticsClientConfig,
  AuthClientConfig,
  ClientConfig,
  ClientConfigVersions,
  CustomClientConfig,
  GeoClientConfig,
  GraphqlClientConfig,
  RestAPIClientConfig,
  StorageClientConfig,
} from '../index.js';
import { AmplifyFault } from '@aws-amplify/platform-core';

void describe('ClientConfigLegacyConverter', () => {
  void it('throw if unsupported version of client config is passed', () => {
    const converter = new ClientConfigLegacyConverter();
    assert.throws(
      () =>
        converter.convertToLegacyConfig({
          // Force feed version 3 as versions are strongly typed and 3 may not even exist
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          version: '3' as any,
        }),
      new AmplifyFault('UnsupportedClientConfigVersion', {
        message: 'Only version 1 of ClientConfig is supported.',
      })
    );
  });

  void it('returns translated legacy config for auth', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      auth: {
        identity_pool_id: 'testIdentityPoolId',
        user_pool_id: 'testUserPoolId',
        user_pool_client_id: 'testWebClientId',
        aws_region: 'testRegion',
        password_policy: {
          min_length: 15,
          require_lowercase: true,
          require_numbers: true,
          require_uppercase: true,
        },
        mfa_methods: ['SMS', 'TOTP'],
        mfa_configuration: 'OPTIONAL',
        user_verification_mechanisms: ['EMAIL', 'PHONE'],
        username_attributes: ['EMAIL'],
        standard_attributes: { EMAIL: { required: true } },
        unauthenticated_identities_enabled: true,
        oauth_domain: 'testDomain',
        oauth_scope: ['email', 'profile'],
        oauth_redirect_sign_in: ['http://callback.com', 'http://callback2.com'],
        oauth_redirect_sign_out: ['http://logout.com', 'http://logout2.com'],
        oauth_response_type: 'code',
        identity_providers: ['provider1', 'provider2'],
      },
    };

    const expectedLegacyConfig: AuthClientConfig = {
      aws_user_pools_id: 'testUserPoolId',
      aws_user_pools_web_client_id: 'testWebClientId',
      aws_cognito_region: 'testRegion',
      aws_cognito_identity_pool_id: 'testIdentityPoolId',
      aws_cognito_mfa_configuration: 'OPTIONAL',
      aws_cognito_mfa_types: ['SMS', 'TOTP'],
      aws_cognito_password_protection_settings: {
        passwordPolicyCharacters: [
          'REQUIRES_NUMBERS',
          'REQUIRES_LOWERCASE',
          'REQUIRES_UPPERCASE',
        ],
        passwordPolicyMinLength: 15,
      },
      aws_cognito_signup_attributes: ['EMAIL'],
      aws_cognito_username_attributes: ['EMAIL'],
      aws_cognito_verification_mechanisms: ['EMAIL', 'PHONE'],
      allowUnauthenticatedIdentities: 'true',
      oauth: {
        domain: 'testDomain',
        scope: ['email', 'profile'],
        redirectSignIn: 'http://callback.com,http://callback2.com',
        redirectSignOut: 'http://logout.com,http://logout2.com',
        responseType: 'code',
      },
      aws_cognito_social_providers: ['provider1', 'provider2'],
    };

    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for data', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      data: {
        aws_region: 'testRegion',
        url: 'testUrl',
        model_introspection: {
          version: 1,
          models: {
            Todo: {
              name: 'Todo',
              fields: {
                id: {
                  name: 'id',
                  isArray: false,
                  type: 'ID',
                  isRequired: true,
                  attributes: [],
                },
              },
              syncable: true,
              pluralName: 'Todos',
              attributes: [
                {
                  type: 'model',
                  properties: {},
                },
                {
                  type: 'key',
                  properties: {
                    fields: ['id'],
                  },
                },
                {
                  type: 'auth',
                  properties: {
                    rules: [
                      {
                        provider: 'userPools',
                        ownerField: 'owner',
                        allow: 'owner',
                        identityClaim: 'cognito:username',
                        operations: ['create', 'update', 'delete', 'read'],
                      },
                      {
                        allow: 'public',
                        operations: ['read'],
                      },
                    ],
                  },
                },
              ],
              primaryKeyInfo: {
                isCustomPrimaryKey: false,
                primaryKeyFieldName: 'id',
                sortKeyFieldNames: [],
              },
            },
          },
          enums: {},
          nonModels: {},
        },
        api_key: 'testApiKey',
        default_authorization_type: 'AMAZON_COGNITO_USER_POOLS',
        authorization_types: ['AMAZON_COGNITO_USER_POOLS', 'API_KEY'],
      },
    };

    const expectedLegacyConfig: GraphqlClientConfig = {
      aws_appsync_authenticationType: 'AMAZON_COGNITO_USER_POOLS',
      aws_appsync_region: 'testRegion',
      aws_appsync_graphqlEndpoint: 'testUrl',
      aws_appsync_apiKey: 'testApiKey',
      aws_appsync_additionalAuthenticationTypes:
        'AMAZON_COGNITO_USER_POOLS,API_KEY',
      modelIntrospection: {
        version: 1,
        models: {
          Todo: {
            name: 'Todo',
            fields: {
              id: {
                name: 'id',
                isArray: false,
                type: 'ID',
                isRequired: true,
                attributes: [],
              },
            },
            syncable: true,
            pluralName: 'Todos',
            attributes: [
              {
                type: 'model',
                properties: {},
              },
              {
                type: 'key',
                properties: {
                  fields: ['id'],
                },
              },
              {
                type: 'auth',
                properties: {
                  rules: [
                    {
                      provider: 'userPools',
                      ownerField: 'owner',
                      allow: 'owner',
                      identityClaim: 'cognito:username',
                      operations: ['create', 'update', 'delete', 'read'],
                    },
                    {
                      allow: 'public',
                      operations: ['read'],
                    },
                  ],
                },
              },
            ],
            primaryKeyInfo: {
              isCustomPrimaryKey: false,
              primaryKeyFieldName: 'id',
              sortKeyFieldNames: [],
            },
          },
        },
        enums: {},
        nonModels: {},
      },
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for storage', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      storage: {
        aws_region: 'testRegion',
        bucket_name: 'testBucket',
      },
    };

    const expectedLegacyConfig: StorageClientConfig = {
      aws_user_files_s3_bucket_region: 'testRegion',
      aws_user_files_s3_bucket: 'testBucket',
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for custom', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      custom: {
        customKey: {
          customNestedKey: {
            someKey: 'SomeValue',
          },
        },
        customArray: ['value1', 'value2'],
      },
    };

    const expectedLegacyConfig: CustomClientConfig = {
      custom: {
        customKey: {
          customNestedKey: {
            someKey: 'SomeValue',
          },
        },
        customArray: ['value1', 'value2'],
      },
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for analytics', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      analytics: {
        aws_region: 'testRegion',
        pinpoint_app_id: 'testAppId',
      },
    };

    const expectedLegacyConfig: AnalyticsClientConfig = {
      Analytics: {
        AWSPinpoint: {
          appId: 'testAppId',
          region: 'testRegion',
        },
      },
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for api', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      api: {
        endpoints: [
          {
            aws_region: 'region1',
            name: 'name1',
            url: 'endPoint1',
            authorization_types: ['AMAZON_COGNITO_USER_POOLS'],
            default_authorization_type: 'AMAZON_COGNITO_USER_POOLS',
          },
          {
            aws_region: 'region2',
            name: 'name2',
            url: 'endPoint2',
            authorization_types: ['AMAZON_COGNITO_USER_POOLS'],
            default_authorization_type: 'AMAZON_COGNITO_USER_POOLS',
          },
        ],
      },
    };

    const expectedLegacyConfig: RestAPIClientConfig = {
      aws_cloud_logic_custom: [
        { endpoint: 'endPoint1', name: 'name1', region: 'region1' },
        {
          endpoint: 'endPoint2',
          name: 'name2',
          region: 'region2',
        },
      ],
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });

  void it('returns translated legacy config for geo', () => {
    const converter = new ClientConfigLegacyConverter();

    const v1Config: ClientConfig = {
      version: ClientConfigVersions.V1,
      geo: {
        aws_region: 'testRegion',
        maps: {
          default: 'map1',
          items: [
            { name: 'map1', style: 'style1' },
            { name: 'map2', style: 'style2' },
          ],
        },
        search_indices: {
          default: 'index1',
          items: ['index1', 'index2'],
        },
        geofence_collections: {
          default: 'geofence1',
          items: ['geofence1', 'geofence2'],
        },
      },
    };

    const expectedLegacyConfig: GeoClientConfig = {
      geo: {
        amazon_location_service: {
          region: 'testRegion',
          maps: {
            default: 'map1',
            items: {
              map1: { style: 'style1' },
              map2: { style: 'style2' },
            },
          },
          search_indices: {
            default: 'index1',
            items: ['index1', 'index2'],
          },
          geofenceCollections: {
            default: 'geofence1',
            items: ['geofence1', 'geofence2'],
          },
        },
      },
    };
    assert.deepStrictEqual(
      converter.convertToLegacyConfig(v1Config),
      expectedLegacyConfig
    );
  });
});
