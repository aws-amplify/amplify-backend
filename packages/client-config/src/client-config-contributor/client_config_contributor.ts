import { ClientConfig } from '../client-config-types/client_config.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';

export type ClientConfigContributor = {
  contribute: (
    backendOutput: UnifiedBackendOutput
  ) => Promise<Partial<ClientConfig>> | Partial<ClientConfig>;
};
