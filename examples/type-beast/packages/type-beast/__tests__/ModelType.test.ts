import { expectTypeTestsToPassAsync } from 'jest-tsd';
import a, { defineData, ClientSchema } from '../index';
import { schemaPreprocessor } from '../src/SchemaProcessor';
import {
  PublicProviders,
  PrivateProviders,
  Operations,
  Operation,
} from '../src/Authorization';

// evaluates type defs in corresponding test-d.ts file
it('should not produce static type errors', async () => {
  await expectTypeTestsToPassAsync(__filename);
});

describe('model auth rules', () => {
  // it('rejects items that are not auth rules', () => {

  // });

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

  it(`can create a "multiple owners" rule an on implied (auto-created) field`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.multipleOwners().inField('authors')]),
    });

    // what customers export
    type Schema = ClientSchema<typeof schema>;

    // If the types are correct, this field should exist
    type AuthorsType = Schema['widget']['authors'];

    // I should NOT be able to assign a singular `string` to it
    // @ts-expect-error
    let authors: AuthorsType = 'string';

    // I SHOULD be able to assign a `string[]`;
    authors = ['username1', 'username2'];

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`throws a fit of an implied (auto-created) field conflicts with an explicit field`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),

          // pluralized `author` fields
          author: a.string().array(),
        })

        // authorization expects `author` to be singular `string`
        // @ts-expect-error
        .authorization([a.allow.owner().inField('author')]),
    });
  });

  it(`can create a static Admins group rule`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.specificGroup('Admins')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can create a static [Admins, Moderators] groups rule`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.specificGroups(['Admins', 'Moderators'])]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can create a dynamic singular groups rule`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([a.allow.groupDefinedIn('businessUnitOwner')]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can create a dynamic multi groups rule`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([
          a.allow.groupsDefinedIn('sharedWithGroups').to(['read']),
        ]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can chain off of inField rules`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([
          a.allow.owner().inField('customOwnerField').to(['create', 'read']),
        ]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`can chain off of multi-owner inField rules`, () => {
    const schema = a.schema({
      widget: a
        .model({
          title: a.string(),
        })
        .authorization([
          a.allow
            .multipleOwners()
            .inField('customOwnerField')
            .to(['create', 'read']),
        ]),
    });

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`includes auth from fields`, () => {
    const schema = a.schema({
      widget: a.model({
        id: a.id(),
        title: a
          .string()
          .authorization([
            a.allow.owner().inField('customOwner').to(['create', 'read']),
          ]),
      }),
    });

    type Schema = ClientSchema<typeof schema>;
    type CustomOwnerType = Schema['widget']['customOwner'];

    // single owner should be allowed
    let customOwner: CustomOwnerType = 'abc';

    // multiple owners should not
    // @ts-expect-error
    customOwner = ['multiple', 'owners'];

    const graphql = schemaPreprocessor(schema).processedSchema;
    expect(graphql).toMatchSnapshot();
  });

  it(`includes auth from related model fields`, () => {
    const schema = a.schema({
      widget: a.model({
        id: a.id(),
        parent: a
          .belongsTo('widget')
          .authorization([
            a.allow.owner().inField('customOwner').to(['create', 'read']),
          ]),
      }),
    });

    type Schema = ClientSchema<typeof schema>;
    type CustomOwnerType = Schema['widget']['customOwner'];

    // single owner should be allowed
    let customOwner: CustomOwnerType = 'abc';

    // multiple owners should not
    // @ts-expect-error
    customOwner = ['multiple', 'owners'];

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
