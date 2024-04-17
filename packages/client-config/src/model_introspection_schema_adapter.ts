import { createGraphqlModelsGenerator } from '@aws-amplify/model-generator';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { S3Client } from '@aws-sdk/client-s3';

/**
 * Adapts static getModelIntrospectionSchemaFromS3Uri from @aws-amplify/model-generator call to make it injectable and testable.
 */
export class ModelIntrospectionSchemaAdapter {
  /**
   * Creates new adapter for getModelIntrospectionSchemaFromS3Uri from @aws-amplify/model-generator.
   */
  constructor(
    private readonly awsClientProvider: AWSClientProvider<{
      getS3Client: S3Client;
      getAmplifyClient: AmplifyClient;
      getCloudFormationClient: CloudFormationClient;
    }>
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
        awsClientProvider: this.awsClientProvider,
      }).generateModels({ target: 'introspection' })
    ).getResults();
    const generatedModelFiles = Object.values(generatedModels);
    if (generatedModelFiles.length !== 1) {
      throw new AmplifyFault('UnexpectedModelIntrospectionSchema', {
        message: `A single model introspection schema is expected, received ${generatedModelFiles.length} values.`,
      });
    }

    try {
      return JSON.parse(generatedModelFiles[0]);
    } catch (e) {
      throw new AmplifyFault(
        'InvalidModelIntrospectionSchema',
        {
          message:
            'Caught exception while converting introspection schema to JSON representation',
        },
        e as Error
      );
    }
  };
}
