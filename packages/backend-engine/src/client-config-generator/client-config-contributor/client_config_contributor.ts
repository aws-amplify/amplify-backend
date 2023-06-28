import { ClientConfig } from '../client_config.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';

export type ClientConfigContributor = {
  contribute(backendOutput: UnifiedBackendOutput): Partial<ClientConfig>;
};
