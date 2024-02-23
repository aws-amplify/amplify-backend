import { AuthClientConfig } from './auth_client_config.js';
import { GraphqlClientConfig } from './graphql_client_config.js';
import { PlatformClientConfig } from './platform_client_config.js';
import { StorageClientConfig } from './storage_client_config.js';
import { CustomClientConfig } from './custom_client_config.js';
import { GeoClientConfig } from './geo_client_config.js';
import { AnalyticsClientConfig } from './analytics_client_config.js';
import { NotificationsClientConfig } from './notifications_client_config.js';

// Major versions of config schemas
import * as clientConfigTypesV1 from '../client-config-schema/config_types_v1.js';
import * as clientConfigTypesV2 from '../client-config-schema/config_types_v2.js';

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
export type ClientConfigGen2 =
  | clientConfigTypesV1.ConfigTypesV1
  | clientConfigTypesV2.ConfigTypesV2;
export { clientConfigTypesV1 };
export { clientConfigTypesV2 };

export type ClientConfig = ClientConfigLegacy | ClientConfigGen2;

export enum ClientConfigFormat {
  MJS = 'mjs',
  JSON = 'json',
  JSON_MOBILE = 'json-mobile',
  TS = 'ts',
  DART = 'dart',
}
