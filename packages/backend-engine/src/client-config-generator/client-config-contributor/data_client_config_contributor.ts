import { ClientConfigContributor } from './client_config_contributor.js';
import { StrictlyTypedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from '../client_config.js';

/**
 *
 */
export class DataClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the data API portion of the client config
   */
  contribute({
    dataOutput,
  }: StrictlyTypedBackendOutput): Pick<
    ClientConfig,
    'API' | 'aws_appsync_apiKey'
  > {
    if (dataOutput === undefined) {
      return {};
    }
    return {
      aws_appsync_apiKey: dataOutput.payload.appSyncApiKey,
      API: {
        graphql_endpoint: dataOutput.payload.appSyncApiEndpoint,
      },
    };
  }
}
