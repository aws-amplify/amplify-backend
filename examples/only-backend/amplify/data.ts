import { a, Data } from 'aws-amplify-backend';

const schema = a.schema({
  Todo: a.model({
    title: a.string(),
    body: a.string(),
  }),
});

export type Schema = typeof schema;

export const data = new Data({
  schema,
});
