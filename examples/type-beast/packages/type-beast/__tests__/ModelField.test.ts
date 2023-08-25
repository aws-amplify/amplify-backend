import { expectTypeTestsToPassAsync } from 'jest-tsd';
import { default as a, ClientSchema, defineData } from '../';

const reference_schema = a.schema({
  Post: a
    .model({
      id: a.id(),
      title: a.string(),
      summary: a.string().optional(),
      viewCount: a.integer().optional(),
      comments: a.hasMany('Comment'),
    })
    .identifier(['id']),
  // .authorization(['anything goes'])
  Comment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
  }),
});

type ReferenceSchemaExport = ClientSchema<typeof reference_schema>;

const reference_data_export = defineData({
  schema: reference_schema,
});

// evaluates type defs in corresponding test-d.ts file
it('should not produce static type errors', async () => {
  await expectTypeTestsToPassAsync(__filename);
});

describe('model fields', () => {
  const schema = reference_schema;
});
