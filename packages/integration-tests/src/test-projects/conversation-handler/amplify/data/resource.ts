import { a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  // This schema mocks expected model where conversation responses are supposed to be recorded.
  ConversationMessageAssistantResponse: a
    .model({
      sessionId: a.id(),
      associatedUserMessageId: a.id(),
      content: a.string(),
      sender: a.enum(['user', 'assistant']),
    })
    .authorization((allow) => [allow.authenticated(), allow.owner()]),
});

export const data = defineData({
  schema,
});
