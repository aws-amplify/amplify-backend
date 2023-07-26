import { AuthClientConfig } from './auth_client_config.js';
import { GraphqlClientConfig } from './graphql_client_config.js';
import { StorageClientConfig } from './storage_client_config.js';

/**
 * Merged type of all category client config types
 */
export type ClientConfig = Partial<
  AuthClientConfig & GraphqlClientConfig & StorageClientConfig
>;
