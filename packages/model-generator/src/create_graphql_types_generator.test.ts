import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { BackendIdentifier } from '@aws-amplify/deployed-backend-client';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';

describe('types generator factory', () => {
  it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: null as unknown as BackendIdentifier,
        credentialProvider: null as unknown as AwsCredentialIdentityProvider,
      })
    );
  });

  it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: { stackName: 'foo' },
        credentialProvider: null as unknown as AwsCredentialIdentityProvider,
      })
    );
  });
});
