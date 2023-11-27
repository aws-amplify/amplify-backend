import { myFunc } from '../function.js';
import { type ClientSchema, Func, a, defineData } from '@aws-amplify/backend';

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
});

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
    reverse: myFunc,
    // Leaving explicit Func invocation here,
    // ensuring we can use functions not added to `defineBackend`.
    echo: Func.fromDir({
      name: 'echoFunc',
      codePath: './echo',
    }),
  },
});
