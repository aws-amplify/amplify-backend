import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      fieldToUpdate: a.integer(), // field changed
      newFieldAdded: a.string(), // new field added
    })
    .authorization((allow) => [allow.publicApiKey().to(['read'])]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    // API Key is used for allow.publicApiKey() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
