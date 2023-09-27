import { describe, it } from 'node:test';
import { LocalAppNameResolver } from './local_app_name_resolver.js';
import assert from 'node:assert';
import { PackageJsonLoader } from '../package_json_loader.js';

void describe('LocalAppNameResolver', () => {
  void it('returns package.json#name', async () => {
    const packageJsonLoaderMock: PackageJsonLoader = {
      loadPackageJson: async () => ({ name: 'testName', version: '0.12.0' }),
    };
    const resolver = new LocalAppNameResolver(packageJsonLoaderMock);
    const result = await resolver.resolve();
    assert.equal(result, 'testName');
  });
});
