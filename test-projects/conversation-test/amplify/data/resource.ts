import { defineData } from '@aws-amplify/backend';

const schema = `
    type Foo @model(subscriptions: { level: off }, mutations: null, queries: null) {
      bar: Int
    }

    type Mutation {
      basicChat(sessionId: ID, content: String): String
      @conversation(
        aiModel: "Claude3Haiku",
        systemPrompt: "You are a helpful chatbot. Respond in 20 words or less."
      )
      
      evilChat(sessionId: ID, content: String): String
      @conversation(
         functionName: "amplify-conversationtest--evilChatHandlerlambdaC10-b1tKw5p9t5bE"
      )
    }
`;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

