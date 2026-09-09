import { defineData } from '@aws-amplify/backend';

export const data = defineData({
  schema: /* GraphQL */ `
    type Todo @model {
      title: String!
    }
  `,
});
