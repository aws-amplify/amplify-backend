import { default as a, ClientSchema, defineData } from 'type-beast';

const schema = a.schema({
  Post: a
    .model({
      id: a.id(),
      title: a.string(),
      viewCount: a.integer().optional(),
      comments: a.hasMany('Comment'),
    })
    .identifier(['id']),
  Comment: a.model({
    id: a.id(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

export default defineData({
  schema,
});
