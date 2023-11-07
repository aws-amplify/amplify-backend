import assert from 'node:assert';
import { describe, it } from 'node:test';
import { BackendIdentifierResolver } from './backend_identifier_resolver.js';
import { assertBackendIdDataEquivalence } from '../test-utils/assert_backend_id_data_equivalence.js';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

void describe('BackendIdentifierResolver', () => {
  void it('returns an App Name and Branch identifier', async () => {
    const backendIdResolver = new BackendIdentifierResolver({
      resolve: () => Promise.resolve('testAppName'),
    });
    assert.deepEqual(await backendIdResolver.resolve({ branch: 'test' }), {
      appName: 'testAppName',
      branchName: 'test',
    });
  });
  void it('returns a App Id identifier', async () => {
    const backendIdResolver = new BackendIdentifierResolver({
      resolve: () => Promise.resolve('testAppName'),
    });
    assertBackendIdDataEquivalence(
      (await backendIdResolver.resolve({
        appId: 'my-id',
        branch: 'my-branch',
      })) as UniqueBackendIdentifier,
      {
        backendId: 'my-id',
        disambiguator: 'my-branch',
      }
    );
  });
  void it('returns a Stack name identifier', async () => {
    const backendIdResolver = new BackendIdentifierResolver({
      resolve: () => Promise.resolve('testAppName'),
    });
    assert.deepEqual(await backendIdResolver.resolve({ stack: 'my-stack' }), {
      stackName: 'my-stack',
    });
  });
});
