import { default as a, ClientSchema, defineData } from 'type-beast';

const schema = a.schema({
  Blog: a
    .model({
      id: a.id(),
      title: a.string(),
      posts: a.hasMany('Post'),
    })
    .identifier(['id']),
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
    bingo: a.string(),
    anotherField: a.string().optional(),
    subComments: a.hasMany('SubComment'),
  }),
  SubComment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
    subSubComments: a.hasMany('SubSubComment'),
  }),
  SubSubComment: a.model({
    id: a.id(),
    bingo: a.string(),
    anotherField: a.string().optional(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

export default defineData({
  schema,
});
