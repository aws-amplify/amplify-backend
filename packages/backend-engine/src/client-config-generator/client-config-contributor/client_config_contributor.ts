import { ClientConfig } from '../client_config.js';
import { StrictlyTypedBackendOutput } from '@aws-amplify/backend-output-schemas';

export type ClientConfigContributor = {
  contribute(backendOutput: StrictlyTypedBackendOutput): Partial<ClientConfig>;
};
