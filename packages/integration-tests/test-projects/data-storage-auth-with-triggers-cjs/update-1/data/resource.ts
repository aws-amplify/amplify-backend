import { defineData } from '@aws-amplify/backend-graphql';

const schema = `
  input AMPLIFY {globalAuthRule: AuthRule = { allow: public }} # FOR TESTING ONLY!

  type Todo @model {
    id: ID!
    name: String!
    description: String
    otherField: String
    newFieldAdded: String
  }
`;

export const data = defineData({ schema });
