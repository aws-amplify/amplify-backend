import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Todo: a.model({
    name: a.string(),
    description: a.string(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

/** @see https://docs.amplify.aws/gen2/build-a-backend/data */
export const data = defineData({ schema });
