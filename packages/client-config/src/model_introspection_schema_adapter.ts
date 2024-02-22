import { getModelIntrospectionSchemaFromS3Uri } from '@aws-amplify/model-generator';
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
    return getModelIntrospectionSchemaFromS3Uri({
      credentialProvider: this.awsCredentialProvider,
      modelSchemaS3Uri,
    });
  };
}
