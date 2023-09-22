import assert from 'assert';
import { describe, it } from 'node:test';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';

describe('types generator', () => {
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => null as unknown as string,
      () => ({ writeToDirectory: () => Promise.resolve(), operations: {} })
    );
    await assert.rejects(() =>
      generator.generateTypes({ target: 'typescript' })
    );
  });
});
