import { describe, it } from 'node:test';
import { LocalDisambiguatorResolver } from './local_disambiguator_resolver.js';
import assert from 'node:assert';

describe('LocalDisambiguatorResolver', () => {
  it('returns the current username', async () => {
    const osMock = {
      userInfo: () => ({ username: 'testUsername' }),
    };
    const resolver = new LocalDisambiguatorResolver(osMock as never);
    const result = await resolver.resolve();
    assert.equal(result, 'testUsername');
  });

  it('can be passed as a function reference', async () => {
    const osMock = {
      userInfo: () => ({ username: 'testUsername' }),
    };
    const resolver = new LocalDisambiguatorResolver(osMock as never);
    const resolveRef = resolver.resolve;
    const result = await resolveRef();
    assert.equal(result, 'testUsername');
  });
});
