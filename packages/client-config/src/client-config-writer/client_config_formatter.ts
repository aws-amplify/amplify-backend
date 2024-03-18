import {
  ClientConfig,
  ClientConfigFormat,
} from '../client-config-types/client_config.js';

/**
 * Type for client config formatter.
 */
export type ClientConfigFormatter = {
  format: (clientConfig: ClientConfig, format: ClientConfigFormat) => string;
};
