import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';

void describe('model generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({
        backendIdentifier: null as unknown as BackendIdentifier,
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
