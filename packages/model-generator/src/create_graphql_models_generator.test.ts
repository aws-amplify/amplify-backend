import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { S3 } from '@aws-sdk/client-s3';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import {
  createGraphqlModelsFromS3UriGenerator,
  createGraphqlModelsGenerator,
} from './create_graphql_models_generator.js';
import { AWSClientProvider } from '@aws-amplify/platform-core';

void describe('models generator factory', () => {
  void describe('createGraphqlModelsGenerator', () => {
    void it('throws an error if a null backendIdentifier is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: null as unknown as DeployedBackendIdentifier,
          awsClientProvider: null as unknown as AWSClientProvider,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: { stackName: 'foo' },
          awsClientProvider: null as unknown as AWSClientProvider,
        })
      );
    });
  });

  void describe('createGraphqlModelsFromS3UriGenerator', () => {
    void it('throws an error if a null modelSchemaS3Uri is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: null as unknown as string,
          awsClientProvider: null as unknown as AWSClientProvider,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: 's3://some_bucket/some_value.graphql',
          awsClientProvider: null as unknown as AWSClientProvider,
        })
      );
    });

    void it('uses passed in s3 client', async () => {
      const mockS3Client = new S3();
      const s3ClientSendMock = mock.method(mockS3Client, 'send');
      const mockGraphqlSchema = `
      type Notification @model @auth(rules: [{allow: public, provider: iam},
        {allow: private, provider: iam}])
      {
        endpoint: String!
        auth: String!
        expirationTime: Int
      }
      `;
      s3ClientSendMock.mock.mockImplementation(() => ({
        Body: {
          transformToString: () => mockGraphqlSchema,
        },
      }));
      mock.method(mockS3Client, 'send', s3ClientSendMock);

      const awsClientProvider = {
        getS3Client: () => mockS3Client,
      } as unknown as AWSClientProvider;
      const generator = createGraphqlModelsFromS3UriGenerator({
        modelSchemaS3Uri: 's3://some_bucket/some_value.graphql',
        awsClientProvider,
      });
      await generator.generateModels({
        target: 'typescript',
      });
      assert.ok(s3ClientSendMock.mock.calls.length === 1);
    });
  });
});
