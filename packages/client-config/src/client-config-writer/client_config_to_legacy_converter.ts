import { AmplifyFault } from '@aws-amplify/platform-core';
import {
  ClientConfig,
  ClientConfigLegacy,
  clientConfigTypesV1,
} from '../client-config-types/client_config.js';

import {
  AnalyticsClientConfig,
  AuthClientConfig,
  GeoClientConfig,
  GraphqlClientConfig,
  StorageClientConfig,
} from '../index.js';
import { RestApiClientConfig } from '../client-config-types/rest_api_client_config.js';

/**
 * Converts unified client config to the legacy format.
 */
export class ClientConfigLegacyConverter {
  /**
   * Converts client config to a shape consumable by legacy libraries.
   */
  convertToLegacyConfig = (clientConfig: ClientConfig): ClientConfigLegacy => {
    // We can only convert from V1 of ClientConfig. For everything else, throw
    if (!this.isClientConfigV1(clientConfig)) {
      throw new AmplifyFault('UnsupportedClientConfigVersion', {
        message: 'Only version 1 of ClientConfig is supported.',
      });
    }

    let legacyConfig: ClientConfigLegacy = {};

    // Gen2 backend constructs use the Stack's region and is identical. We use these to
    // populate the root level aws_project_region in legacy config.
    if (clientConfig.auth || clientConfig.data || clientConfig.storage) {
      legacyConfig.aws_project_region =
        clientConfig.auth?.aws_region ??
        clientConfig.data?.aws_region ??
        clientConfig.storage?.aws_region;
    }

    // Auth
    if (clientConfig.auth) {
      const authClientConfig: AuthClientConfig = {
        aws_user_pools_id: clientConfig.auth.user_pool_id,
        aws_cognito_region: clientConfig.auth.aws_region,
        aws_user_pools_web_client_id: clientConfig.auth.user_pool_client_id,
        aws_cognito_identity_pool_id: clientConfig.auth.identity_pool_id,
      };

      if (clientConfig.auth.unauthenticated_identities_enabled) {
        authClientConfig.allowUnauthenticatedIdentities = clientConfig.auth
          .unauthenticated_identities_enabled
          ? 'true'
          : 'false';
      }

      authClientConfig.aws_cognito_mfa_types = clientConfig.auth.mfa_methods;

      if (clientConfig.auth.standard_attributes) {
        authClientConfig.aws_cognito_signup_attributes = Object.keys(
          clientConfig.auth.standard_attributes
        );
      }

      authClientConfig.aws_cognito_username_attributes =
        clientConfig.auth.username_attributes;
      authClientConfig.aws_cognito_verification_mechanisms =
        clientConfig.auth.user_verification_mechanisms;

      if (clientConfig.auth.mfa_configuration) {
        authClientConfig.aws_cognito_mfa_configuration =
          clientConfig.auth.mfa_configuration;
      }

      if (clientConfig.auth.password_policy) {
        authClientConfig.aws_cognito_password_protection_settings = {};
        if (clientConfig.auth.password_policy.min_length) {
          authClientConfig.aws_cognito_password_protection_settings = {
            passwordPolicyMinLength:
              clientConfig.auth.password_policy.min_length,
          };
        }
        const requirements = [];
        if (clientConfig.auth.password_policy.require_numbers) {
          requirements.push('REQUIRES_NUMBERS');
        }
        if (clientConfig.auth.password_policy.require_lowercase) {
          requirements.push('REQUIRES_LOWERCASE');
        }
        if (clientConfig.auth.password_policy.require_uppercase) {
          requirements.push('REQUIRES_UPPERCASE');
        }
        if (clientConfig.auth.password_policy.require_symbols) {
          requirements.push('REQUIRES_SYMBOLS');
        }
        authClientConfig.aws_cognito_password_protection_settings.passwordPolicyCharacters =
          requirements;
      }

      if (clientConfig.auth.identity_providers) {
        authClientConfig.aws_cognito_social_providers =
          clientConfig.auth.identity_providers;
      }

      // TBD OAuthClientId aka authClientConfig.oauth?.clientId
      authClientConfig.oauth = {};
      if (clientConfig.auth.oauth_domain) {
        authClientConfig.oauth.domain = clientConfig.auth.oauth_domain;
      }
      if (clientConfig.auth.oauth_scope) {
        authClientConfig.oauth.scope = clientConfig.auth.oauth_scope;
      }

      if (clientConfig.auth.oauth_redirect_sign_in) {
        authClientConfig.oauth.redirectSignIn =
          clientConfig.auth.oauth_redirect_sign_in.join(',');
      }
      if (clientConfig.auth.oauth_redirect_sign_out) {
        authClientConfig.oauth.redirectSignOut =
          clientConfig.auth.oauth_redirect_sign_out.join(',');
      }
      if (clientConfig.auth.oauth_response_type) {
        authClientConfig.oauth.responseType =
          clientConfig.auth.oauth_response_type;
      }
      if (Object.keys(authClientConfig.oauth).length === 0) {
        delete authClientConfig.oauth;
      }
      legacyConfig = { ...legacyConfig, ...authClientConfig };
    }

    // Data category
    if (clientConfig.data) {
      const dataConfig: GraphqlClientConfig = {
        aws_appsync_authenticationType:
          clientConfig.data.default_authorization_type,
        aws_appsync_region: clientConfig.data.aws_region,
        aws_appsync_graphqlEndpoint: clientConfig.data.url,
        modelIntrospection: clientConfig.data.model_introspection,
      };

      if (clientConfig.data.api_key) {
        dataConfig.aws_appsync_apiKey = clientConfig.data.api_key;
      }

      if (clientConfig.data.authorization_types) {
        dataConfig.aws_appsync_additionalAuthenticationTypes =
          clientConfig.data.authorization_types.join(',');
      }

      if (clientConfig.data.conflict_resolution_mode) {
        dataConfig.aws_appsync_conflictResolutionMode =
          clientConfig.data.conflict_resolution_mode;
      }

      legacyConfig = { ...legacyConfig, ...dataConfig };
    }

    // Storage category
    if (clientConfig.storage) {
      const storageConfig: StorageClientConfig = {
        aws_user_files_s3_bucket: clientConfig.storage.bucket_name,
        aws_user_files_s3_bucket_region: clientConfig.storage.aws_region,
      };
      legacyConfig = { ...legacyConfig, ...storageConfig };
    }

    // Analytics category
    if (clientConfig.analytics) {
      const analyticsConfig: AnalyticsClientConfig = {
        Analytics: {
          Pinpoint: {
            appId: clientConfig.analytics.pinpoint_app_id,
            region: clientConfig.analytics.aws_region,
          },
        },
      };
      legacyConfig = { ...legacyConfig, ...analyticsConfig };
    }

    // Geo category
    if (clientConfig.geo) {
      const geoConfig: GeoClientConfig = {
        geo: {
          amazon_location_service: {
            region: clientConfig.geo.aws_region,
          },
        },
      };

      if (clientConfig.geo.maps) {
        const mapsLegacyConfig: Record<string, { style: string }> = {};
        for (const mapItem of clientConfig.geo.maps.items) {
          if (mapItem.name && mapItem.style) {
            mapsLegacyConfig[mapItem.name] = { style: mapItem.style };
          }
        }
        geoConfig.geo!.amazon_location_service.maps = {
          default: clientConfig.geo.maps.default,
          items: mapsLegacyConfig,
        };
      }

      if (clientConfig.geo.search_indices) {
        geoConfig.geo!.amazon_location_service.search_indices =
          clientConfig.geo.search_indices;
      }

      if (clientConfig.geo.geofence_collections) {
        geoConfig.geo!.amazon_location_service.geofenceCollections =
          clientConfig.geo.geofence_collections;
      }

      legacyConfig = { ...legacyConfig, ...geoConfig };
    }

    // Rest API
    if (clientConfig.api && clientConfig.api.endpoints) {
      const restAPIConfig: RestApiClientConfig = { aws_cloud_logic_custom: [] };
      for (const apiEndpoint of clientConfig.api.endpoints) {
        restAPIConfig.aws_cloud_logic_custom.push({
          endpoint: apiEndpoint.url,
          name: apiEndpoint.name,
          region: apiEndpoint.aws_region,
        });
      }

      legacyConfig = { ...legacyConfig, ...restAPIConfig };
    }

    // Custom
    if (clientConfig.custom) {
      legacyConfig.custom = clientConfig.custom;
    }

    return legacyConfig;
  };

  isClientConfigV1 = (
    clientConfig: ClientConfig
  ): clientConfig is clientConfigTypesV1.AWSAmplifyBackendOutputs => {
    return clientConfig.version === '1';
  };
}
