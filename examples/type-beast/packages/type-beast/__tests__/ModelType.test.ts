import { expectTypeTestsToPassAsync } from 'jest-tsd';
import a, { defineData } from '../index';
import { schemaPreprocessor } from '../src/SchemaProcessor';
import {
  PublicProviders,
  PrivateProviders,
  GroupProvider,
  OwnerProviders,
  CustomProvider,
  Operations,
  Operation,
} from '../src/authorization';

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
        .authorization((allow) => [allow.public()]),
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
          .authorization((allow) => [allow.public('bad-provider')]),
      });
    }).toThrow();
  });

  it('can define private auth with no provider', () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization((allow) => [allow.private()]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it('can define owner auth with no provider', () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization((allow) => [allow.owner()]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it('can define owner auth with owner field spec', () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization((allow) => [allow.owner().inField('title')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  for (const provider of PublicProviders) {
    it(`can define public with with provider ${provider}`, () => {
      const schema = a.schema({
        widget: a
          .model({
            title: a.string(),
          })
          .authorization((allow) => [allow.public(provider)]),
      });

      const graphql = schemaPreprocessor(schema).processedSchema;
      expect(graphql).toMatchSnapshot();
    });

    const TestOperations: Operation[][] = [
      // each individual operation
      ...Operations.map((op) => [op]),

      // a couple sanity checks to support a combinations
      ['create', 'read', 'update', 'delete'],
      ['create', 'read', 'listen'],
    ];

    for (const operations of TestOperations) {
      it(`can define public with with provider ${provider} for operation `, () => {
        const schema = a.schema({
          wonket: {},
          widget: a
            .model({
              title: a.string(),
            })
            .authorization((allow) => [allow.public(provider).to(operations)]),
        });

        const graphql = schemaPreprocessor(schema).processedSchema;
        expect(graphql).toMatchSnapshot();
      });
    }
  }

  for (const provider of PrivateProviders) {
    it(`can define private with with provider ${provider}`, () => {
      const schema = a.schema({
        widget: a
          .model({
            title: a.string(),
          })
          .authorization((allow) => [allow.private(provider)]),
      });

      const graphql = schemaPreprocessor(schema).processedSchema;
      expect(graphql).toMatchSnapshot();
    });

    const TestOperations: Operation[][] = [
      // each individual operation
      ...Operations.map((op) => [op]),

      // a couple sanity checks to support a combinations
      ['create', 'read', 'update', 'delete'],
      ['create', 'read', 'listen'],
    ];

    for (const operations of TestOperations) {
      it(`can define private with with provider ${provider} for operation `, () => {
        const schema = a.schema({
          widget: a
            .model({
              title: a.string(),
            })
            .authorization((allow) => [allow.private(provider).to(operations)]),
        });

        const graphql = schemaPreprocessor(schema).processedSchema;
        expect(graphql).toMatchSnapshot();
      });
    }
  }
});
