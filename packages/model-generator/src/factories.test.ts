import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlModelGenerator } from './factories.js';

describe('model generator factory', () => {
  it('throws an error if a null apiId is passed in', async () => {
    assert.throws(() =>
      createGraphqlModelGenerator({ apiId: null as unknown as string })
    );
  });
});
