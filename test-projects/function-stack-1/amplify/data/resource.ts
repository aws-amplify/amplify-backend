import {
  a,
  defineData,
  defineFunction,
  defineStack,
  type ClientSchema,
} from "@aws-amplify/backend";

const stack = defineStack('awesome-stack');

const testHandler = defineFunction({
  scope: stack
});

const schema = a
  .schema({
    Todo: a
      .model({
        name: a.string(),
        description: a.string(),
      })
      .authorization((allow) => [allow.publicApiKey()]),
  })
  .authorization((allow) => [allow.resource(testHandler)]);

export type Schema = ClientSchema<typeof schema>;

// Defines the data resource to be deployed
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
  scope: stack
});
