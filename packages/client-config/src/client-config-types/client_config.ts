import { type AuthClientConfig } from './auth_client_config.js';
import { type GraphqlClientConfig } from './graphql_client_config.js';
import { type PlatformClientConfig } from './platform_client_config.js';
import { type StorageClientConfig } from './storage_client_config.js';

/**
 * Merged type of all category client config types
 */
export type ClientConfig = Partial<
  AuthClientConfig &
    GraphqlClientConfig &
    StorageClientConfig &
    PlatformClientConfig
>;

export enum ClientConfigFormat {
  MJS = 'mjs',
  JSON = 'json',
  JSON_MOBILE = 'json-mobile',
  TS = 'ts',
  DART = 'dart',
}
