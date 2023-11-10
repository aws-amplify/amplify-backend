import { describe, it } from 'node:test';
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
});
