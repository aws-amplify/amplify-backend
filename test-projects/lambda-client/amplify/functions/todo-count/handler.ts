import type { Handler } from "aws-lambda";
// import { Amplify } from "aws-amplify";
// import { generateClient } from "aws-amplify/data";
// import type { Schema } from "../../data/resource";
// import { resourceConfig, libraryOptions } from "$amplify/client-config/todo-count"
//
// Amplify.configure(resourceConfig, libraryOptions);
//
// const client = generateClient<Schema>();

export const handler: Handler = async () => {
  // const todos = (await client.models.Todo.list()).data;
  // return todos.length;

  console.log(process.env.MIS);
};
