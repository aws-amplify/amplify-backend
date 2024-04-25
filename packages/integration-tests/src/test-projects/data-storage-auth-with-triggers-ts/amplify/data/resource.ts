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
      filedToChange: a.string(),
      fieldToRemove: a.string(),
    })
    .authorization((allow) => [
      allow.owner(),
      allow.publicApiKey().to(['read']),
    ]),

  EchoResponse: a.customType({
    content: a.string(),
    executionDuration: a.float(),
  }),

  customQuery: a
    .query()
    .arguments({ id: a.string() })
    .returns(a.ref('Todo'))
    .authorization((allow) => allow.authenticated())
    .handler(
      // provisions JS resolver
      a.handler.custom({
        dataSource: a.ref('Todo'),
        entry: './js_custom_fn.js',
      })
    ),

  echo: a
    .query()
    .arguments({ content: a.string() })
    .returns(a.ref('EchoResponse'))
    .authorization((allow) => allow.authenticated())
    .handler(a.handler.function('echo')),

  echoInline: a
    .query()
    .arguments({ content: a.string() })
    .returns(a.ref('EchoResponse'))
    .authorization((allow) => allow.authenticated())
    .handler(
      a.handler.function(
        defineFunction({
          entry: './echo/handler2.ts',
        })
      )
    ),
}) as never; // Not 100% sure why TS is complaining here. The error I'm getting is "The inferred type of 'schema' references an inaccessible 'unique symbol' type. A type annotation is necessary."

// ^ appears to be caused by these 2 rules in tsconfig.base.json: https://github.com/aws-amplify/amplify-backend/blob/8d9a7a4c3033c474b0fc78379cdd4c1854d890ce/tsconfig.base.json#L7-L8
// Possibly something to do with all the `references` in the nested configs. Using the same tsconfig in a new amplify app doesn't cause the error.

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'apiKey',
    // API Key is used for allow.publicApiKey() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
  functions: {
    reverse: defaultNodeFunc,
    // Leaving explicit Func invocation here,
    // ensuring we can use functions not added to `defineBackend`.
    echo: defineFunction({
      name: 'echoFunc',
      entry: './echo/handler.ts',
    }),
  },
});
