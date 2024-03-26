import { describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { SandboxBackendIdResolver } from './sandbox_id_resolver.js';

void describe('SandboxIdResolver', () => {
  void it('resolve can be used as a function reference', async () => {
    const resolver = new SandboxBackendIdResolver(
      {
        resolve: () => Promise.resolve('testAppName'),
      },
      () => ({ username: 'testUsername' } as never)
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(result.namespace, 'testAppName');
    assert.equal(result.name, 'testUsername');
  });

  void it('uses nameOverride if present', async () => {
    const userInfoMock = mock.fn<() => never>();
    const resolver = new SandboxBackendIdResolver(
      {
        resolve: () => Promise.resolve('testAppName'),
      },
      userInfoMock
    );
    const result = await resolver.resolve('differentName');
    assert.equal(result.namespace, 'testAppName');
    assert.equal(result.name, 'differentName');
    assert.equal(userInfoMock.mock.callCount(), 0);
  });
});
