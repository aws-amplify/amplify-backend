import { Func, defineData } from '@aws-amplify/backend';
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
      echo(message: String!): String! @function(name: "echo")
    }
  `,
  functions: {
    reverse: myFunc,
    // Leaving explicit Func invocation here,
    // ensuring we can use functions not added to `defineBackend`.
    echo: Func.fromDir({
      name: 'echoFunc',
      codePath: './echo',
    }),
  },
});
