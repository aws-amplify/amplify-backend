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
    .authorization([a.allow.owner(), a.allow.public().to(['read'])]),

  EchoResponse: a.customType({
    content: a.string(),
    executionDuration: a.float(),
  }),

  customQuery: a
    .query()
    .arguments({ id: a.string() })
    .returns(a.ref('Todo'))
    .authorization([a.allow.private()])
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
    .authorization([a.allow.private()])
    .handler(
      a.handler.function(
        defineFunction({
          name: 'echoFunc',
          entry: './echo/handler.ts',
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
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
  functions: {
    reverse: defaultNodeFunc,
  },
});
