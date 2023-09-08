import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlDocumentGenerator } from './create_graphql_document_generator.js';

describe('model generator factory', () => {
  it('throws an error if a null apiId is passed in', async () => {
    assert.throws(() =>
      createGraphqlDocumentGenerator({ apiId: null as unknown as string })
    );
  });
});
