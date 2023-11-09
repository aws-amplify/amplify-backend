import assert from 'node:assert';
import { describe, it } from 'node:test';
import { BackendIdentifierResolver } from './backend_identifier_resolver.js';

void describe('BackendIdentifierResolver', () => {
  void it('returns an App Name and Branch identifier', async () => {
    const backendIdResolver = new BackendIdentifierResolver({
      resolve: () => Promise.resolve('testAppName'),
    });
    assert.deepStrictEqual(
      await backendIdResolver.resolve({ branch: 'test' }),
      {
        appName: 'testAppName',
        branchName: 'test',
      }
    );
  });
  void it('returns a App Id identifier', async () => {
    const backendIdResolver = new BackendIdentifierResolver({
      resolve: () => Promise.resolve('testAppName'),
    });
    const actual = await backendIdResolver.resolve({
      appId: 'my-id',
      branch: 'my-branch',
    });
    assert.deepStrictEqual(actual, {
      namespace: 'my-id',
      name: 'my-branch',
      type: 'branch',
    });
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
