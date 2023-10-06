import { ClientConfigContributor } from './client_config_contributor.js';
import {
  UnifiedBackendOutput,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';
import {
  GraphqlClientConfig,
  ModelIntrospectionSchema,
} from '../client-config-types/graphql_client_config.js';
import { S3Client } from '@aws-sdk/client-s3';
import {
  S3StringObjectFetcher,
  StackMetadataGraphqlModelsGenerator,
} from '@aws-amplify/model-generator';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
/**
 * Translator for the Graphql API portion of ClientConfig
 */
export class GraphqlClientConfigContributor implements ClientConfigContributor {
  // Retrieve the model introspection schema if the schema is discoverable.
  getModelIntrospectionSchema = async (
    schemaUri?: string
  ): Promise<ModelIntrospectionSchema | undefined> => {
    if (!schemaUri) {
      return;
    }

    let modelIntrospection = undefined;
    const generator = new StackMetadataGraphqlModelsGenerator(
      async () => {
        const s3Client = new S3Client({
          credentials: fromNodeProviderChain(),
        });
        const schemaFetcher = new S3StringObjectFetcher(s3Client);
        return await schemaFetcher.fetch(schemaUri);
      },
      (fileMap: Record<string, string>) => {
        const generatedFiles = Object.values(fileMap);
        if (generatedFiles.length !== 1) {
          throw new Error('placeholder');
        }
        modelIntrospection = JSON.parse(generatedFiles[0]);
        return {
          writeToDirectory: async (): Promise<void> => {
            /* I'm a value-add */ return;
          },
        };
      }
    );
    await generator.generateModels({
      target: 'introspection',
    });

    return modelIntrospection;
  };

  /**
   * Given some BackendOutput, contribute the Graphql API portion of the client config
   */
  contribute = async ({
    [graphqlOutputKey]: graphqlOutput,
  }: UnifiedBackendOutput): Promise<
    GraphqlClientConfig | Record<string, never>
  > => {
    if (graphqlOutput === undefined) {
      return {};
    }
    const config: GraphqlClientConfig = {
      aws_appsync_graphqlEndpoint: graphqlOutput.payload.awsAppsyncApiEndpoint,
      aws_appsync_region: graphqlOutput.payload.awsAppsyncRegion,
      aws_appsync_apiKey: graphqlOutput.payload.awsAppsyncApiKey,
      aws_appsync_authenticationType:
        graphqlOutput.payload.awsAppsyncAuthenticationType,
      aws_appsync_additionalAuthenticationTypes:
        graphqlOutput.payload.awsAppsyncAdditionalAuthenticationTypes,
      aws_appsync_conflictResolutionMode:
        graphqlOutput.payload.awsAppsyncConflictResolutionMode,
      modelIntrospection: await this.getModelIntrospectionSchema(
        graphqlOutput.payload.amplifyApiModelSchemaS3Uri
      ),
    };

    return config;
  };
}
