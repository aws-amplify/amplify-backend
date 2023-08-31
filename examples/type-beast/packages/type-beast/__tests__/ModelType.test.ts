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

  it('can define private auth with no provider', () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.private()]),
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
        .authorization([a.allow.owner()]),
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
        .authorization([a.allow.owner().inField('title')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can specify operations `, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.public().to(['create', 'read'])]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can specify an owner identityClaim`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.owner().identityClaim('user_id')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can create a "multiple owners" rule on an existing field`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
          authors: a.string().array(),
        })
        .authorization([a.allow.multipleOwners().inField('authors')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it.only(`can create a "multiple owners" rule an on implied (auto-created) field`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.multipleOwners().inField('authors')]),
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
          .authorization([a.allow.public(provider)]),
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
      it(`can define public with with provider ${provider} for operations ${operations}`, () => {
        const schema = a.schema({
          widget: a
            .model({
              title: a.string(),
            })
            .authorization([
              a.allow.public(provider).to(operations),
              // 'whatever',
            ]),
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
          .authorization([a.allow.private(provider)]),
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
      it(`can define private with with provider ${provider} for operations ${operations}`, () => {
        const schema = a.schema({
          widget: a
            .model({
              title: a.string(),
            })
            .authorization([a.allow.private(provider).to(operations)]),
        });

        const graphql = schemaPreprocessor(schema).processedSchema;
        expect(graphql).toMatchSnapshot();
      });
    }
  }
});
