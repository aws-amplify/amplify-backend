import { defineData } from '@aws-amplify/backend';

const schema = `
  input AMPLIFY {globalAuthRule: AuthRule = { allow: public }} # FOR TESTING ONLY!

  type Todo @model {
    id: ID!
    name: String!
    description: String
    otherField: String
  }
`;

export const data = defineData({ schema });
