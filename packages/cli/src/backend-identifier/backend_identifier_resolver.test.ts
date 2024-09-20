import assert from 'node:assert';
import { describe, it } from 'node:test';
import { AppBackendIdentifierResolver } from './backend_identifier_resolver.js';

void describe('BackendIdentifierResolver', () => {
  void describe('resolveDeployedBackendIdentifier', () => {
    void it('returns an App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepStrictEqual(
        await backendIdResolver.resolveDeployedBackendIdentifier({
          branch: 'test',
        }),
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
      const actual = await backendIdResolver.resolveDeployedBackendIdentifier({
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
      assert.deepEqual(
        await backendIdResolver.resolveDeployedBackendIdentifier({
          stack: 'my-stack',
        }),
        {
          stackName: 'my-stack',
        }
      );
    });
  });

  void describe('resolveDeployedBackendIdToBackendId', () => {
    void it('returns backend identifier from App Name and Branch identifier', async () => {
      const backendIdResolver = new AppBackendIdentifierResolver({
        resolve: () => Promise.resolve('testAppName'),
      });
      assert.deepEqual(
        await backendIdResolver.resolveBackendIdentifier({
          appId: 'testAppName',
          branch: 'test',
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
        await backendIdResolver.resolveBackendIdentifier({
          stack: 'amplify-reasonableName-userName-branch-testHash',
        }),
        {
          namespace: 'reasonableName',
          name: 'userName',
          type: 'branch',
          hash: 'testHash',
        }
      );
    });
  });
});
