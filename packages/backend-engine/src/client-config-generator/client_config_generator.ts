import { ClientConfig } from './client_config.js';

export type ClientConfigGenerator = {
  generateClientConfig(): Promise<ClientConfig>;
};
