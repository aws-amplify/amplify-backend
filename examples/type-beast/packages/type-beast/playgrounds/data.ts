import { default as a, ClientSchema, defineData } from "../index";

const schema = a.schema({
  Post: a
    .model({
      postId: a.id(),
      title: a.string().optional(),
      // comments: a.hasMany("Comment").optional(),
    })
    //,
    .identifier(["postId"]),
  Comment: a.model({
    id: a.id(),
  }),
});

export type Schema = ClientSchema<typeof schema>;

export default defineData({
  schema,
});
