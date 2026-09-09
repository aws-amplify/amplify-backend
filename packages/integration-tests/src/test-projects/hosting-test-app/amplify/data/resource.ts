import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      filedToChange: a.string(),
      fieldToRemove: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
    ]),
});

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    // API Key is used for allow.publicApiKey() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
