import {
  ApiClientConfig,
  ApiClientConfigMapping,
} from './api_client_config.js';
import { ApiOutput } from './output-schema/index.js';

// no access to CLI types
// import { ClientConfigContributor } from './client_config_contributor.js';
// import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';

/**
 * Translator for the API portion of ClientConfig
 */
export class ApiClientConfigContributor {
  // no type safety on implements ClientConfigContributor
  // Build will succeed in data repo if missing contribute function
  // The build would fail in CLI repo if missing contribute function

  /**
   * Given some BackendOutput, contribute the data API portion of the client config
   */
  contribute({
    // no type safety on apiOutput name
    // Build would succeed in data and cli repo if name was changed.
    apiOutput,
  }: {
    apiOutput: ApiOutput;
  }): ApiClientConfig | Record<string, never> {
    if (apiOutput === undefined) {
      return {};
    }
    return {
      aws_appsync_region:
        apiOutput.payload[ApiClientConfigMapping.aws_appsync_region],
      aws_appsync_graphqlEndpoint:
        apiOutput.payload[ApiClientConfigMapping.aws_appsync_graphqlEndpoint],
      aws_appsync_authenticationType:
        apiOutput.payload[
          ApiClientConfigMapping.aws_appsync_authenticationType
        ],
      graphql_endpoint:
        apiOutput.payload[ApiClientConfigMapping.graphql_endpoint],
      aws_appsync_apiKey:
        apiOutput.payload[ApiClientConfigMapping.aws_appsync_apiKey],
      graphql_endpoint_iam_region:
        apiOutput.payload[ApiClientConfigMapping.graphql_endpoint_iam_region],
    };
  }
}
