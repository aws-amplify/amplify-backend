import * as a from '@aws-amplify/type-beast';

export const schema = a.schema({
  Todo: a.model({
    id: a.string().optional(),
    name: a.string(),
    owner: a.string(),
    done: a.boolean(),
  }),
});
