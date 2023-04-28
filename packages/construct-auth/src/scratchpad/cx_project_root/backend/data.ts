import { a, Data } from '../../aws_amplify_backend/data_types.js';

const schema = a.schema({
  Todo: a.model({
    title: a.string(),
    body: a.string(),
  }),
});

export const data = Data({ schema });
