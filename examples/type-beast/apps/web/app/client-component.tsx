"use client";
import { useState, useEffect } from "react";
import styles from "./client.module.css";
import { Amplify, API } from "aws-amplify";
// this will be an export from aws-amplify/api
import { SelectionSet } from "./utility-types";
import { Schema } from "../../backend/data";
import { default as awsconfig } from "../src/aws-exports";
import { default as modelIntrospection } from "../src/model-introspection.json";

Amplify.configure({
  ...awsconfig,
  API: {
    modelIntrospection,
  },
});

Amplify.Logger.LOG_LEVEL = "DEBUG";

const client = API.generateClient<Schema>();

type Post = Schema["Post"];
type Comment = Schema["Comment"];

function Post(props: { post: Post }): JSX.Element {
  const {
    post,
    post: { id, title, comments },
  } = props;

  const [postComments, setPostComments] = useState<Comment[]>([]);

  useEffect(() => {
    getComments();
  }, []);

  async function getComments() {
    // const comments = await comments({nextToken})
    setPostComments(await comments()); // post.comments()
  }

  async function addComment() {
    await client.models.Comment.create({
      id: "comment" + Math.floor(Math.random() * 1_000_000_000_000),
      bingo: "Comment " + Date.now(),
      postCommentsId: id,
    });

    await getComments();
  }

  return (
    <div>
      <h3>{title}</h3>
      <div>
        <h5>Comments</h5>
        <div>
          {postComments.map((pc) => {
            return <p key={pc.id}>{pc.bingo}</p>;
          })}
        </div>
        <button onClick={() => addComment()}>Add Comment</button>
      </div>
    </div>
  );
}

export function ClientComponent(): JSX.Element {
  const [res, setRes] = useState<any>();
  const [posts, setPosts] = useState<Post[]>([]);

  const btnHandlers = {
    create: async () => {
      const res = await client.models.Post.create({
        id: "post" + Date.now(),
        title: "My Post",
      });

      const post: Post = res;
      setRes(res);
      setPosts(await client.models.Post.list());
    },
    get: async () => {
      const [latest] = await client.models.Post.list();

      const post = await client.models.Post.get({ id: latest.id });

      console.log("Post", post);

      const comments = await post.comments();

      setRes(post);
    },
    update: async () => {
      const res = await client.models.Post.update({
        id: "post1",
        title: "Updated Post",
      });

      setRes(res);
    },
    delete: async () => {
      const comments = await client.models.Comment.list();
      const posts = await client.models.Post.list();

      for (const comment of comments) {
        await client.models.Comment.delete({ id: comment.id });
      }

      for (const post of posts) {
        await client.models.Post.delete({ id: post.id });
      }

      setRes("deleted");
      setPosts(await client.models.Post.list());
    },
    list: async () => {
      const posts = await client.models.Post.list();

      setRes(undefined);
      setPosts(posts);
    },
    listCustom: async () => {
      // const posts = await client.models.Post.list();
      const posts = await client.models.Post.list({
        selectionSet: ["id", "title", "comments.*"],
      });

      console.log("custom sel set", posts);

      setRes(posts);
    },
  };

  return (
    <>
      <div className={styles.buttons}>
        <button onClick={btnHandlers["create"]}>Create</button>
        <button onClick={btnHandlers["get"]}>Get</button>
        <button onClick={btnHandlers["update"]}>Update</button>
        <button onClick={btnHandlers["delete"]}>Delete All</button>
        <button onClick={btnHandlers["list"]}>List</button>
        <button onClick={btnHandlers["listCustom"]}>
          List (Custom sel. set)
        </button>
      </div>
      {!res ? (
        <div className={styles.result}>
          <h2>Posts</h2>
          {posts.map((post) => (
            <Post post={post} key={post.id}></Post>
          ))}
        </div>
      ) : (
        <pre>{JSON.stringify(res, null, 2)}</pre>
      )}
    </>
  );
}
