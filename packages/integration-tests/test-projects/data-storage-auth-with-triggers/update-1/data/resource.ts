import { defineData } from '@aws-amplify/backend-graphql';

const schema = /* GraphQL */ `
  type Todo @model {
    id: ID!
    name: String!
    description: String
    otherField: String
    newFieldAdded: String
  }
`;

export const data = defineData({ schema });
