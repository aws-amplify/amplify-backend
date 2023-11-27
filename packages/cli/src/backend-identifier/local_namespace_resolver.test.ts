import { describe, it } from 'node:test';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import assert from 'node:assert';

void describe('LocalAppNameResolver', () => {
  void it('returns package.json#name', async () => {
    const packageJsonReaderMock = {
      readFromCwd: () => ({ name: 'testName' }),
    };
    const resolver = new LocalNamespaceResolver(packageJsonReaderMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'testName');
  });
});
