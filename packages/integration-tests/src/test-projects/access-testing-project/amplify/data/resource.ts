import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  PublicTodo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.guest()]),
  PrivateTodo: a
    .model({
      content: a.string(),
    })
    .authorization((allow) => [allow.authenticated('iam')]),
}) as never; // Not 100% sure why TS is complaining here. The error I'm getting is "The inferred type of 'schema' references an inaccessible 'unique symbol' type. A type annotation is necessary."

// ^ appears to be caused by these 2 rules in tsconfig.base.json: https://github.com/aws-amplify/amplify-backend/blob/8d9a7a4c3033c474b0fc78379cdd4c1854d890ce/tsconfig.base.json#L7-L8
// Possibly something to do with all the `references` in the nested configs. Using the same tsconfig in a new amplify app doesn't cause the error.

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
