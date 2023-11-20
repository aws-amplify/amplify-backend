import { type ClientConfig } from '../client-config-types/client_config.js';
import { type UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';

export type ClientConfigContributor = {
  contribute: (
    backendOutput: UnifiedBackendOutput
  ) => Promise<Partial<ClientConfig>> | Partial<ClientConfig>;
};
