import { AuthClientConfig } from './auth_client_config.js';
import { GraphqlClientConfig } from './graphql_client_config.js';
import { PlatformClientConfig } from './platform_client_config.js';
import { StorageClientConfig } from './storage_client_config.js';
import { CustomClientConfig } from './custom_client_config.js';
import { GeoClientConfig } from './geo_client_config.js';
import { AnalyticsClientConfig } from './analytics_client_config.js';
import { NotificationsClientConfig } from './notifications_client_config.js';

// Versions of new unified config schemas
import * as clientConfigTypesV1 from '../client-config-schema/client_config_v1.1.js';

/**
 * Merged type of all category client config legacy types
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

/**
 * Versions of client config schema supported by "this" package version.
 * Create union for supported versions here, such as
 * ClientConfig = clientConfigTypesV1.AWSAmplifyBackendOutputs | clientConfigTypesV2.AWSAmplifyBackendOutputs;
 */
export type ClientConfig = clientConfigTypesV1.AWSAmplifyBackendOutputs;

export { clientConfigTypesV1 };

export enum ClientConfigVersionOption {
  V0 = '0', // Legacy client config
  V1 = '1.1',
}

export type ClientConfigVersion = `${ClientConfigVersionOption}`;

// Client config version that is generated by default if customers didn't specify one
export const DEFAULT_CLIENT_CONFIG_VERSION: ClientConfigVersion =
  ClientConfigVersionOption.V1;

/**
 * Return type of `getClientConfig`. This types narrow the returned client config version
 * if the caller specified a static version, e.g. `generateClientConfig(_, _, ClientConfigVersions.V1)`
 *
 * Add new supported version here such as
 * export type ClientConfigVersionType<T> = T extends '1.1'
 * ? clientConfigTypesV1.AWSAmplifyBackendOutputs
 * : T extends '2'
 * ? clientConfigTypesV2.AWSAmplifyBackendOutputs
 * : never;
 */
export type ClientConfigVersionTemplateType<T> = T extends '1.1'
  ? clientConfigTypesV1.AWSAmplifyBackendOutputs
  : never;

export enum ClientConfigFormat {
  MJS = 'mjs',
  JSON = 'json',
  JSON_MOBILE = 'json-mobile',
  TS = 'ts',
  DART = 'dart',
}

export enum ClientConfigFileBaseName {
  LEGACY = 'amplifyconfiguration',
  DEFAULT = 'amplify_outputs',
}

export type GenerateClientConfigToFileResult = {
  filesWritten: string[];
};
