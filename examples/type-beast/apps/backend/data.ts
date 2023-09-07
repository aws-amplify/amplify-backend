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
      summary: a.string().optional(),
      viewCount: a.integer().optional(),
      comments: a.hasMany('Comment'),
    })
    .identifier(['id'])
    .authorization([
      a.allow.public(),
      // a.allow.owner().inField('customOwner').to(['create']),
      // a.allow.multipleOwners().to(['update', 'read']).inField('authors'),
      // a.allow.multipleOwners().to(['read']).inField('editors'),
      // a.allow.owner().inField('mainAuthor'),
      // a.allow.groupDefinedIn('somegroup'),
      // a.allow.owner(),
      // a.allow.groupsDefinedIn('mygroups'),
    ]),
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
