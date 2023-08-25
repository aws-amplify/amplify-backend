import { expectTypeTestsToPassAsync } from 'jest-tsd';
import a, { defineData } from '../index';
import { schemaPreprocessor } from '../src/SchemaProcessor';
import { Providers } from '../src/authorization';

// evaluates type defs in corresponding test-d.ts file
it('should not produce static type errors', async () => {
  await expectTypeTestsToPassAsync(__filename);
});

// console.log({ m: JSON.stringify(m, null, 2) });
// console.dir(schema, { depth: 100 });
// console.dir(defineData({ schema }), { depth: 100 });

describe('model auth rules', () => {
  it('can define public auth with no provider', () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.public()]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it('fails loudly on invalid provider', () => {
    expect(() => {
      a.schema({
        widget: a
          .model({
            title: a.string(),
          })
          // @ts-expect-error
          .authorization([a.allow.public('bad-provider')]),
      });
    }).toThrow();
  });

  for (const provider of Providers) {
    it(`can define public with with provider ${provider}`, () => {
      const schema = a.schema({
        widget: a
          .model({
            title: a.string(),
          })
          .authorization([a.allow.public(provider)]),
      });

      const graphql = schemaPreprocessor(schema).processedSchema;
      expect(graphql).toMatchSnapshot();
    });
  }
});
