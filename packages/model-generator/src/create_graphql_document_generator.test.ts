import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { AWSClientProvider } from '@aws-amplify/platform-core';

void describe('model generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: null as unknown as DeployedBackendIdentifier,
        awsClientProvider: null as unknown as AWSClientProvider,
      })
    );
  });

  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: { stackName: 'foo' },
        awsClientProvider: null as unknown as AWSClientProvider,
      })
    );
  });
});
