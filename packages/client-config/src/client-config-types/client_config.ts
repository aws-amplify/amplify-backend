import { AuthClientConfig } from './auth_client_config.js';
import { GraphqlClientConfig } from './graphql_client_config.js';
import { PlatformClientConfig } from './platform_client_config.js';
import { StorageClientConfig } from './storage_client_config.js';
import { CustomClientConfig } from './custom_client_config.js';
import { GeoClientConfig } from './geo_client_config.js';
import { AnalyticsClientConfig } from './analytics_client_config.js';
import { NotificationsClientConfig } from './notifications_client_config.js';

// Major versions of config schemas
import * as clientConfigTypesV1 from '../client-config-schema/client_config_v1.js';
import * as clientConfigTypesV2 from '../client-config-schema/client_config_v2.js';

/**
 * Merged type of all category client config types
 */
export type ClientConfigLegacy = Partial<
  AnalyticsClientConfig &
    AuthClientConfig &
    GeoClientConfig &
    GraphqlClientConfig &
    NotificationsClientConfig &
    StorageClientConfig &
    PlatformClientConfig &
    CustomClientConfig
>;

// Versions of client config schema supported by "this" package version
export type ClientConfig =
  | clientConfigTypesV1.ClientConfigV1
  | clientConfigTypesV2.ClientConfigV2;
export { clientConfigTypesV1 };
export { clientConfigTypesV2 };

export type ClientConfigVersion = '0' | '1' | '2';

export enum ClientConfigFormat {
  MJS = 'mjs',
  JSON = 'json',
  JSON_MOBILE = 'json-mobile',
  TS = 'ts',
  DART = 'dart',
}
