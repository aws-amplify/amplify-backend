import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { DataClientConfig } from '../client-config-types/data_client_config.js';

/**
 * Translator for the Data/API portion of ClientConfig
 */
export class DataClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the data API portion of the client config
   */
  contribute({
    dataOutput,
  }: UnifiedBackendOutput): DataClientConfig | Record<string, never> {
    if (dataOutput === undefined) {
      return {};
    }
    return {
      aws_appsync_graphqlEndpoint: dataOutput.payload.appSyncApiEndpoint,
      aws_appsync_apiKey: dataOutput.payload.appSyncApiKey,
    };
  }
}
