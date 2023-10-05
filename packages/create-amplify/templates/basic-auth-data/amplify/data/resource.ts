import { defineData } from '@aws-amplify/backend-graphql';
import { type ClientSchema, a } from '@aws-amplify/amplify-api-next-alpha';

const schema = a.schema({
  Todo: a.model({
    id: a.id(),
    name: a.string(),
    description: a.string().optional(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({ schema });
