import { a, defineData, defineFunction } from '@aws-amplify/backend';

const schema = a.schema({
  Temperature: a.customType({
    value: a.integer(),
    unit: a.string(),
  }),

  getTemperature: a
    .query()
    .arguments({ city: a.string() })
    .returns(a.ref('Temperature'))
    .authorization((allow) => [allow.authenticated()])
    .handler(
      a.handler.function(
        defineFunction({
          entry: './thermometer.ts',
        })
      )
    ),

  // This schema mocks expected model where conversation responses are supposed to be recorded.
  ConversationMessageAssistantResponse: a
    .model({
      conversationId: a.id(),
      associatedUserMessageId: a.id(),
      content: a.string(),
      sender: a.enum(['user', 'assistant']),
    })
    .authorization((allow) => [allow.authenticated(), allow.owner()]),
});

export const data = defineData({
  schema,
});
