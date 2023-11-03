import { describe, it } from 'node:test';
import assert from 'node:assert';
import { SandboxIdResolver } from './sandbox_id_resolver.js';

void describe('SandboxIdResolver', () => {
  void it('resolve can be used as a function reference', async () => {
    const resolver = new SandboxIdResolver(
      {
        resolve: () => Promise.resolve('testAppName'),
      },
      () => ({ username: 'testUsername' } as never)
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(result.backendId, 'testAppName');
    assert.equal(result.disambiguator, 'testUsername');
  });
  void it('resolve when insanely long appName is given', async () => {
    const resolver = new SandboxIdResolver(
      {
        resolve: () =>
          Promise.resolve(
            'InsanelyLongApplicationNameProvidedByCustomer' +
              'DoNotKnowWhatCustomersAreThinkingWhenChoosingThisGreatBigName'
          ),
      },
      () => ({ username: 'testUsername' } as never)
    );
    const resolverRef = resolver.resolve;
    const result = await resolverRef();
    assert.equal(
      result.backendId,
      'InsanelyLongApplicationNameProvidedByCustomerDoNotKnowWhat' +
        'CustomersAreThinkingWhenChoosingThisGreat'
    );
    assert.equal(result.disambiguator, 'testUsername');
  });
});
