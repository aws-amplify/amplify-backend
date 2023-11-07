import { Func, defineData } from '@aws-amplify/backend';
import { myFunc } from '../function';

const schema = `
  input AMPLIFY {globalAuthRule: AuthRule = { allow: public }} # FOR TESTING ONLY!

  type Todo @model {
    id: ID!
    name: String!
    description: String
    otherField: String
    reverse(message: String!): String! @function(name: "reverse")
    echo(message: String!): String! @function(name: "echo")
  }
`;

export const data = defineData({
  schema,
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
