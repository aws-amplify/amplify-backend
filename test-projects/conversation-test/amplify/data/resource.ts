import { defineData } from '@aws-amplify/backend';

const schema = `
    type Foo @model(subscriptions: { level: off }, mutations: null, queries: null) {
      bar: Int
    }

    type Mutation {
      pirateChat(sessionId: ID, content: String): String
      @conversation(
        aiModel: "Claude3Haiku",
        systemPrompt: "You are a helpful chatbot. Respond in 20 words or less."
      )
    }
`;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});

// Previous schemas.

/*

    type Foo @model(subscriptions: { level: off }, mutations: null, queries: null) {
      bar: Int
    }

    type Mutation {
      pirateChat(sessionId: ID, content: String): String
      @conversation(
        aiModel: "Claude3Haiku",
        functionName: "amplify-conversationtest--conversationapp2lambdaha-jka2V1S0O98j",
            systemPrompt: "You are a helpful chatbot. Respond in 20 words or less."
      )
    }

 */
