import {
  a,
  defineData,
  defineFunction,
  type ClientSchema,
} from "@aws-amplify/backend";

// WELL WELL WELL, after all that coding...
// Now here's the problem.
// Even if we allow passing data stack to function....
// The function is an input to the schema
// The schema is an input to data
// and having data being an input to function creates circular dependency
// not even at runtime....
// Therefore, this approach is deemed to fail regardless of implementation.
// The only solution of such sort would be to externalize stack definition
// for both data and function.
//
// BTW this is second attempt of building DX like this.
// I also tried implementing some magic in container and factories to surface access to scope/stack.
// But such solution would also hit exact same cycle problem.
const testHandler = defineFunction({
});

const schema = a
  .schema({
    Todo: a
      .model({
        name: a.string(),
        description: a.string(),
      })
      .authorization((allow) => [allow.publicApiKey()]),
  })
  .authorization((allow) => [allow.resource(testHandler)]);

export type Schema = ClientSchema<typeof schema>;

// Defines the data resource to be deployed
export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: { expiresInDays: 30 },
  },
});
