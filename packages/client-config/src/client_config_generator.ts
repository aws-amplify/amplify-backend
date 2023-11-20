import { type ClientConfig } from './client-config-types/client_config.js';

export type ClientConfigGenerator = {
  generateClientConfig: () => Promise<ClientConfig>;
};
