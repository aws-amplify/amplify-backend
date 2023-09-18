import assert from 'assert';
import { describe, it, mock } from 'node:test';
import { schema as appsyncGraphql } from './test-assets/appsync_schema.example.js';
import { AppSyncGraphqlTypesGenerator } from './graphql_types_generator.js';

describe('types generator', () => {
  it('if `fetchSchema` returns null, it should throw an error', async () => {
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => null as unknown as string,
      async () => {
        return;
      }
    );
    await assert.rejects(() =>
      generator.generateTypes({ target: 'typescript', outDir: './' })
    );
  });

  it(`Writes to the provided output directory`, async () => {
    const writer =
      mock.fn<
        (outDir: string, fileName: string, content: string) => Promise<void>
      >();
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => appsyncGraphql,
      writer
    );
    const outDir = './a-fake-out-directory';
    await generator.generateTypes({ target: 'typescript', outDir });
    assert.equal(writer.mock.calls[0].arguments[0], outDir);
  });

  it(`writes typescript API file`, async () => {
    const writer =
      mock.fn<
        (outDir: string, fileName: string, content: string) => Promise<void>
      >();
    const generator = new AppSyncGraphqlTypesGenerator(
      async () => appsyncGraphql,
      writer
    );
    await generator.generateTypes({ target: 'typescript', outDir: './' });
    assert.equal(writer.mock.calls[0].arguments[1], 'API.ts');
  });
});
