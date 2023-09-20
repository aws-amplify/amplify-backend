import { ClientConfigContributor } from './client_config_contributor.js';
import { UnifiedBackendOutput } from '@aws-amplify/backend-output-schemas';
import { GraphqlClientConfig } from '../client-config-types/graphql_client_config.js';

/**
 * Translator for the Graphql API portion of ClientConfig
 */
export class GraphqlClientConfigContributor implements ClientConfigContributor {
  /**
   * Given some BackendOutput, contribute the Graphql API portion of the client config
   */
  contribute = ({
    graphqlOutput,
  }: UnifiedBackendOutput): GraphqlClientConfig | Record<string, never> => {
    if (graphqlOutput === undefined) {
      return {};
    }
    const config: GraphqlClientConfig = {
      aws_appsync_graphqlEndpoint: graphqlOutput.payload.awsAppsyncApiEndpoint,
      aws_appsync_region: graphqlOutput.payload.awsAppsyncRegion,
      aws_appsync_apiId: graphqlOutput.payload.awsAppsyncApiId,
      aws_appsync_apiKey: graphqlOutput.payload.awsAppsyncApiKey,
      aws_appsync_authenticationType:
        graphqlOutput.payload.awsAppsyncAuthenticationType,
      aws_appsync_apiUri: graphqlOutput.payload.amplifyApiModelSchemaS3Uri,
    };

    if (graphqlOutput.payload.awsAppsyncApiKey) {
      config.aws_appsync_apiKey = graphqlOutput.payload.awsAppsyncApiKey;
    }

    return config;
  };
}
