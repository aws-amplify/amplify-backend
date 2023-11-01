import { defineData } from '@aws-amplify/backend';

const schema = /* GraphQL */ `
  type Todo @model {
    id: ID!
    name: String!
    description: String
    otherField: String
  }
`;

export const data = defineData({ schema });
