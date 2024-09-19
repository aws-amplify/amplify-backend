import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AppBackendIdentifierResolver } from './backend_identifier_resolver.js';

void describe('BackendIdentifierResolver', () => {
  void describe('resolve', () => {
    void it('returns an App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
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
      const backendIdResolver = new AppBackendIdentifierResolver({
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
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(await backendIdResolver.resolve({ stack: 'my-stack' }), {
        stackName: 'my-stack',
      });
    });
  });

  void describe('resolveDeployedBackendIdToBackendId', () => {
    void it('returns backend identifier from App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveDeployedBackendIdToBackendId({
          appName: 'testAppName',
          branchName: 'test',
        }),
        {
          namespace: 'testAppName',
          name: 'test',
          type: 'branch',
        }
      );
    });
    void it('returns backend identifier from Stack identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveDeployedBackendIdToBackendId({
          stackName: 'amplify-reasonableName-userName-branch-testHash',
        }),
        {
          namespace: 'reasonableName',
          name: 'userName',
          type: 'branch',
          hash: 'testHash',
        }
      );
    });
    void it('does nothing if already backend identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveDeployedBackendIdToBackendId({
          namespace: 'testAppName',
          name: 'test',
          type: 'branch',
        }),
        {
          namespace: 'testAppName',
          name: 'test',
          type: 'branch',
        }
      );
    });
  });
});
