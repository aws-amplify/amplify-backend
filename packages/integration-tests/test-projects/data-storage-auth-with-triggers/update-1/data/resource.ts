import { defineData } from '@aws-amplify/backend';
import { myFunc } from '../function.js';

export const data = defineData({
  schema: /* GraphQL */ `
    type Todo @model {
      id: ID!
      name: String!
      description: String
      otherField: String
      newFieldAdded: String
    }
    type Query {
      reverse(message: String!): String! @function(name: "reverse")
    }
  `,
  functions: {
    reverse: myFunc,
  },
});
