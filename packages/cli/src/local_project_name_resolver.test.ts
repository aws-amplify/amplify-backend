import { describe, it } from 'node:test';
import { LocalProjectNameResolver } from './local_project_name_resolver.js';
import assert from 'node:assert';

describe('LocalProjectNameResolver', () => {
  it('returns package.json name', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };
    const resolver = new LocalProjectNameResolver(
      packageJsonLoaderMock as never
    );
    const result = await resolver.resolve();
    assert.equal(result, 'testName');
  });

  it('can be used as a function reference', async () => {
    const packageJsonLoaderMock = {
      loadCwdPackageJson: async () => ({ name: 'testName' }),
    };
    const resolver = new LocalProjectNameResolver(
      packageJsonLoaderMock as never
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(result, 'testName');
  });
});
