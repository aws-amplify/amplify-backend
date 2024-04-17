import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AWSClientProvider } from '@aws-amplify/platform-core';

void describe('types generator factory', () => {
  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: null as unknown as BackendIdentifier,
        awsClientProvider: null as unknown as AWSClientProvider,
      })
    );
  });

  void it('throws an error if a null backendIdentifier is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({
        backendIdentifier: { stackName: 'foo' },
        awsClientProvider: null as unknown as AWSClientProvider,
      })
    );
  });
});
