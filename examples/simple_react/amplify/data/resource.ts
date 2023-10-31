import { defineData } from '@aws-amplify/backend';

const schema = `
  type Todo @model @auth(rules: [{ allow: private }]) {
    id: ID!
    name: String!
    description: String
  }
`;

export const data = defineData({ schema });
