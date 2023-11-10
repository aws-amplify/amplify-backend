import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';
import { DeployedBackendIdentifier } from '@aws-amplify/deployed-backend-client';

void describe('model generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: null as unknown as DeployedBackendIdentifier,
        credentialProvider: null as unknown as AwsCredentialIdentityProvider,
      })
    );
  });

  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: { stackName: 'foo' },
        credentialProvider: null as unknown as AwsCredentialIdentityProvider,
      })
    );
  });
});
