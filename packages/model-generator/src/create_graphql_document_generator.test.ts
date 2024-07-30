import assert from 'node:assert';
import { describe, it, mock } from 'node:test';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';
import {
  BackendOutputClientError,
  BackendOutputClientErrorType,
  BackendOutputClientFactory,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { S3Client } from '@aws-sdk/client-s3';

const awsClientProvider = {
  getAmplifyClient: () => new AmplifyClient(),
  getCloudFormationClient: () => new CloudFormationClient(),
  getS3Client: () => new S3Client(),
};

void describe('model generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: null as unknown as DeployedBackendIdentifier,
        awsClientProvider,
      })
    );
  });

  void it('throws an error if a null awsClientProvider is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: { stackName: 'foo' },
        awsClientProvider: null as unknown as AWSClientProvider<{
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
    const generator = createGraphqlDocumentGenerator({
      backendIdentifier: { stackName: 'foo' },
      awsClientProvider,
    });
    await assert.rejects(
      () => generator.generateModels({ targetFormat: 'javascript' }),
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
    const generator = createGraphqlDocumentGenerator({
      backendIdentifier: { stackName: 'stackThatDoesNotExist' },
      awsClientProvider,
    });
    await assert.rejects(
      () => generator.generateModels({ targetFormat: 'javascript' }),
      (error: AmplifyUserError) => {
        assert.strictEqual(error.message, 'Stack does not exist.');
        assert.ok(error.resolution);
        return true;
      }
    );
  });
});
