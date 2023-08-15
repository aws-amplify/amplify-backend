import { describe, it } from 'node:test';
import { LocalAppIdResolver } from './local_app_id_resolver.js';
import assert from 'node:assert';

describe('LocalAppIdResolver', () => {
  it('returns concatenation of package.json#name and $(whoami)', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };

    const osMock = {
      userInfo: () => ({
        username: 'testUsername',
      }),
    };
    const resolver = new LocalAppIdResolver(
      packageJsonLoaderMock as never,
      osMock as never
    );
    const result = await resolver.resolve();
    assert.equal(result, 'testName-testUsername');
  });

  it('can be used as a function reference', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };

    const osMock = {
      userInfo: () => ({
        username: 'testUsername',
      }),
    };
    const resolver = new LocalAppIdResolver(
      packageJsonLoaderMock as never,
      osMock as never
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(result, 'testName-testUsername');
  });
});
