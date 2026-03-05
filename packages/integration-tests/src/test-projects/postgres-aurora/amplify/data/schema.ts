import { a } from '@aws-amplify/data-schema';

export const schema = a.schema({
  Todo: a
    .model({
      id: a.id().required(),
      content: a.string(),
    })
    .identifier(['id'])
    .authorization((allow) => [allow.publicApiKey()]),
});
