import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AWSClientProvider } from '@aws-amplify/plugin-types';
import { AmplifyClient } from '@aws-sdk/client-amplify';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

void describe('model generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: null as unknown as DeployedBackendIdentifier,
        awsClientProvider: null as unknown as AWSClientProvider<{
          getAmplifyClient: AmplifyClient;
          getCloudFormationClient: CloudFormationClient;
        }>,
      })
    );
  });

  void it('throws an error if a null backendIdentifier is passed in', async () => {
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
});
