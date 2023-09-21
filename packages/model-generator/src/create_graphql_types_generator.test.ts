import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createGraphqlTypesGenerator } from './create_graphql_types_generator.js';

describe('types generator factory', () => {
  it('throws an error if a null apiId is passed in', async () => {
    assert.throws(() =>
      createGraphqlTypesGenerator({ apiId: null as unknown as string })
    );
  });
});
