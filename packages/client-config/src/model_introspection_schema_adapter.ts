import {
  createGraphqlModelsGenerator,
} from '@aws-amplify/model-generator';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';

/**
 * Adapts static getModelIntrospectionSchemaFromS3Uri from @aws-amplify/model-generator call to make it injectable and testable.
 */
export class ModelIntrospectionSchemaAdapter {
  /**
   * Creates new adapter for getModelIntrospectionSchemaFromS3Uri from @aws-amplify/model-generator.
   */
  constructor(
    private readonly awsCredentialProvider: AwsCredentialIdentityProvider
  ) {}

  /**
   * Generates the client configuration for a given backend
   */
  getModelIntrospectionSchemaFromS3Uri = async (
    modelSchemaS3Uri: string | undefined
  ): Promise<unknown | undefined> => {
    if (!modelSchemaS3Uri) {
      return;
    }
    const generatedModels = await (
      await createGraphqlModelsGenerator({
        modelSchemaS3Uri,
        credentialProvider: this.awsCredentialProvider,
      }).generateModels({ target: 'introspection' })
    ).getResults();
    const generatedModelFiles = Object.values(generatedModels);
    if (generatedModelFiles.length !== 1) {
      throw new Error(
        `A single model introspection schema is expected, received ${generatedModelFiles.length} values.`
      );
    }

    try {
      return JSON.parse(generatedModelFiles[0]);
    } catch (_) {
      throw new Error(
        'Caught exception while converting introspection schema to JSON representation'
      );
    }
  };
}
