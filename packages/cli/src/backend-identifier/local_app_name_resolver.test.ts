import { describe, it } from 'node:test';
import { LocalAppNameResolver } from './local_app_name_resolver.js';
import assert from 'node:assert';

void describe('LocalAppNameResolver', () => {
  void it('returns package.json#name', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };
    const resolver = new LocalAppNameResolver(packageJsonLoaderMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'testName');
  });

  void it('removes any punctuation or symbols', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({
        name: 'A.,.B@cd,..E, , .f , .Ghi, _@/ //, @, Jkl /',
      }),
    };
    const resolver = new LocalAppNameResolver(packageJsonLoaderMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'ABcdEfGhiJkl');
  });
});
