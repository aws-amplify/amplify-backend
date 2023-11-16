import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import {
  createGraphqlModelsFromS3UriGenerator,
  createGraphqlModelsGenerator,
} from './create_graphql_models_generator.js';

void describe('models generator factory', () => {
  void describe('createGraphqlModelsGenerator', () => {
    void it('throws an error if a null backendIdentifier is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: null as unknown as DeployedBackendIdentifier,
          credentialProvider: null as unknown as AwsCredentialIdentityProvider,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: { stackName: 'foo' },
          credentialProvider: null as unknown as AwsCredentialIdentityProvider,
        })
      );
    });
  });

  void describe('createGraphqlModelsFromS3UriGenerator', () => {
    void it('throws an error if a null modelSchemaS3Uri is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: null as unknown as string,
          credentialProvider: null as unknown as AwsCredentialIdentityProvider,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: 's3://some_bucket/some_value.graphql',
          credentialProvider: null as unknown as AwsCredentialIdentityProvider,
        })
      );
    });
  });
});
