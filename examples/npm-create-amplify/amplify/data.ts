import { defineData } from 'aws-amplify-backend';
import { a } from 'aws-amplify-backend/data';

export const schema = a.schema({
  Todo: a.model({
    id: a.string().optional(),
    name: a.string(),
    owner: a.string(),
    done: a.boolean(),
  }),
});

export default defineData({
  schema,
});
