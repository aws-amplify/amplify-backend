import { a, defineData } from 'aws-amplify-backend';

const schema = a.schema({
  Todo: a.model({
    name: a.string(),
    description: a.string(),
    isDone: a.boolean().default(false),
  }),
});

export type Schema = typeof schema;

export default defineData({
  schema,
});
