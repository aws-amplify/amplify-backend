import type { Handler } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
// import { Amplify } from "aws-amplify";
// import { generateClient } from "aws-amplify/data";
// import type { Schema } from "../../data/resource";
// import { resourceConfig, libraryOptions } from "$amplify/client-config/todo-count"

// Amplify.configure(resourceConfig, libraryOptions);
//
// const client = generateClient<Schema>();

export const handler: Handler = async () => {
  console.log(JSON.stringify(process.env, null, 2));

  const s3Client = new S3Client();
  const response = await s3Client.send(
    new GetObjectCommand({
      Bucket: process.env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_BUCKET_NAME,
      Key: process.env.AMPLIFY_DATA_MODEL_INTROSPECTION_SCHEMA_KEY,
    })
  );

  const content = await response.Body?.transformToString();
  console.log(content);

  // const todos = (await client.models.Todo.list()).data;
  // return todos.length;
};
