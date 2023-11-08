import { describe, it } from 'node:test';
import { LocalNamespaceResolver } from './local_namespace_resolver.js';
import assert from 'node:assert';

void describe('LocalAppNameResolver', () => {
  void it('returns package.json#name', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };
    const resolver = new LocalNamespaceResolver(packageJsonLoaderMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'testName');
  });

  void it('removes any punctuation or symbols', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({
        name: 'A./.B@cd,_.E, , .f , .Ghi, _@ //, @, Jkl /',
      }),
    };
    const resolver = new LocalNamespaceResolver(packageJsonLoaderMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'A-Bcd-EfGhi---Jkl-');
  });
});
