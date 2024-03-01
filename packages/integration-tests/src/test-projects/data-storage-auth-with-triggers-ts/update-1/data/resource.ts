import { defaultNodeFunc } from '../function.js';
import {
  type ClientSchema,
  a,
  defineData,
  defineFunction,
} from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a
    .model({
      content: a.string(),
      filedChanged: a.string(), // field changed
      newFieldAdded: a.string(), // new field added
    })
    .authorization([a.allow.owner(), a.allow.public().to(['read'])]),

  EchoResponse: a.customType({
    content: a.string(),
    executionDuration: a.float(),
  }),

  echo: a
    .query()
    .arguments({ content: a.string() })
    .returns(a.ref('EchoResponse'))
    .authorization([a.allow.private()])
    .function('echo'),
}) as never; // Not 100% sure why TS is complaining here. The error I'm getting is "The inferred type of 'schema' references an inaccessible 'unique symbol' type. A type annotation is necessary."

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
  functions: {
    reverse: defaultNodeFunc,
    // Leaving explicit defineFunction invocation here to ensure we can use functions not added to `defineBackend`.
    echo: defineFunction({
      name: 'echoFunc',
      entry: './echo/handler.ts',
    }),
  },
});
