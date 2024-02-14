import { AuthClientConfig } from './auth_client_config.js';
import { GraphqlClientConfig } from './graphql_client_config.js';
import { PlatformClientConfig } from './platform_client_config.js';
import { StorageClientConfig } from './storage_client_config.js';
import { CustomClientConfig } from './custom_client_config.js';
import { GeoClientConfig } from './geo_client_config.js';
import { AnalyticsClientConfig } from './analytics_client_config.js';
import { NotificationsClientConfig } from './notifications_client_config.js';

/**
 * Merged type of all category client config types
 */
export type ClientConfig = Partial<
  AnalyticsClientConfig &
    AuthClientConfig &
    GeoClientConfig &
    GraphqlClientConfig &
    NotificationsClientConfig &
    StorageClientConfig &
    PlatformClientConfig &
    CustomClientConfig
>;

export enum ClientConfigFormat {
  MJS = 'mjs',
  JSON = 'json',
  JSON_MOBILE = 'json-mobile',
  TS = 'ts',
  DART = 'dart',
}
