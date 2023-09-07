import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlDocumentGenerator } from './factories.js';

describe('model generator factory', () => {
  it('throws an error if a null apiId is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({ apiId: null as unknown as string })
    );
  });
});
