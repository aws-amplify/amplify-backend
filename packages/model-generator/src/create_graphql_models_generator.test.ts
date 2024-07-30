import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { S3, S3Client } from '@aws-sdk/client-s3';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import {
  createGraphqlModelsFromS3UriGenerator,
  createGraphqlModelsGenerator,
} from './create_graphql_models_generator.js';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyUserError } from '@aws-amplify/platform-core';

const awsClientProvider = {
  getAmplifyClient: () => new AmplifyClient(),
  getCloudFormationClient: () => new CloudFormationClient(),
  getS3Client: () => new S3Client(),
};

void describe('models generator factory', () => {
  void describe('createGraphqlModelsGenerator', () => {
    void it('throws an error if a null backendIdentifier is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: null as unknown as DeployedBackendIdentifier,
          awsClientProvider,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsGenerator({
          backendIdentifier: { stackName: 'foo' },
          awsClientProvider: null as unknown as AWSClientProvider<{
            getS3Client: S3Client;
            getAmplifyClient: AmplifyClient;
            getCloudFormationClient: CloudFormationClient;
          }>,
        })
      );
    });

    void it('throws an error if deployment is currently in progress', async () => {
      const fakeBackendOutputClient = {
        getOutput: mock.fn(() => {
          throw new BackendOutputClientError(
            BackendOutputClientErrorType.DEPLOYMENT_IN_PROGRESS,
            'deployment in progress'
          );
        }),
      };
      mock.method(
        BackendOutputClientFactory,
        'getInstance',
        () => fakeBackendOutputClient
      );
      const generator = createGraphqlModelsGenerator({
        backendIdentifier: { stackName: 'foo' },
        awsClientProvider,
      });
      await assert.rejects(
        () => generator.generateModels({ target: 'javascript' }),
        (error: AmplifyUserError) => {
          assert.strictEqual(
            error.message,
            'Deployment is currently in progress.'
          );
          assert.ok(error.resolution);
          return true;
        }
      );
    });

    void it('throws an error if stack does not exist', async () => {
      const fakeBackendOutputClient = {
        getOutput: mock.fn(() => {
          throw new BackendOutputClientError(
            BackendOutputClientErrorType.NO_STACK_FOUND,
            'stack does not exist'
          );
        }),
      };
      mock.method(
        BackendOutputClientFactory,
        'getInstance',
        () => fakeBackendOutputClient
      );
      const generator = createGraphqlModelsGenerator({
        backendIdentifier: { stackName: 'stackThatDoesNotExist' },
        awsClientProvider,
      });
      await assert.rejects(
        () => generator.generateModels({ target: 'javascript' }),
        (error: AmplifyUserError) => {
          assert.strictEqual(error.message, 'Stack does not exist.');
          assert.ok(error.resolution);
          return true;
        }
      );
    });
  });

  void describe('createGraphqlModelsFromS3UriGenerator', () => {
    void it('throws an error if a null modelSchemaS3Uri is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: null as unknown as string,
          awsClientProvider: null as unknown as AWSClientProvider<{
            getS3Client: S3Client;
            getAmplifyClient: AmplifyClient;
            getCloudFormationClient: CloudFormationClient;
          }>,
        })
      );
    });

    void it('throws an error if a null credentialProvider is passed in', async () => {
      assert.throws(() =>
        createGraphqlModelsFromS3UriGenerator({
          modelSchemaS3Uri: 's3://some_bucket/some_value.graphql',
          awsClientProvider: null as unknown as AWSClientProvider<{
            getS3Client: S3Client;
            getAmplifyClient: AmplifyClient;
            getCloudFormationClient: CloudFormationClient;
          }>,
        })
      );
    });

    void it('uses passed in s3 client', async () => {
      const mockS3Client = new S3();
      const mockGraphqlSchema = `
      type Notification @model @auth(rules: [{allow: public, provider: iam},
        {allow: private, provider: iam}])
      {
        endpoint: String!
        auth: String!
        expirationTime: Int
      }
      `;
      const s3ClientSendMock = mock.method(mockS3Client, 'send', () => ({
        Body: {
          transformToString: () => mockGraphqlSchema,
        },
      }));
      mock.method(mockS3Client, 'send', s3ClientSendMock);

      const awsClientProvider = {
        getS3Client: () => mockS3Client,
      } as unknown as AWSClientProvider<{
        getS3Client: S3Client;
        getAmplifyClient: AmplifyClient;
        getCloudFormationClient: CloudFormationClient;
      }>;
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
