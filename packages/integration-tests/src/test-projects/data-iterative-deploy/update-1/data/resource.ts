import { defineData } from '@aws-amplify/backend';

export const data = defineData({
  schema: /* GraphQL */ `
    type Todo @model {
      field1: String! @index
      field2: String! @index
    }
  `,
});
