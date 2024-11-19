import { a, ClientSchema, defineData } from '@aws-amplify/backend';
import { todoCount } from '../functions/todo-count/resource.js';
import { customerS3Import } from '../functions/customer-s3-import/resource.js';

const schema = a
  .schema({
    Todo: a
      .model({
        title: a.string().required(),
        done: a.boolean().default(false), // default value is false
      })
      .authorization((allow) => [allow.publicApiKey()]),
    todoCount: a
      .query()
      .arguments({})
      .returns(a.integer())
      .handler(a.handler.function(todoCount))
      .authorization((allow) => [allow.publicApiKey()]),
    noopImport: a
      .query()
      .arguments({})
      .returns(a.string())
      .handler(a.handler.function(customerS3Import))
      .authorization((allow) => [allow.publicApiKey()]),
  })
  .authorization((allow) => [
    allow.resource(todoCount),
    allow.resource(customerS3Import),
  ]);

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
