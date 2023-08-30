import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SandboxIdResolver } from './sandbox_id_resolver.js';

describe('SandboxIdResolver', () => {
  it('resolve can be used as a function reference', async () => {
    const resolver = new SandboxIdResolver(
      {
        resolve: () => Promise.resolve('testAppName'),
      },
      () => ({ username: 'testUsername' } as never)
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(result, 'testAppName-testUsername');
  });
});
