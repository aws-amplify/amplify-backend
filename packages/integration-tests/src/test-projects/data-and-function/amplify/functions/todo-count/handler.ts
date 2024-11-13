import type { Handler } from 'aws-lambda';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '../../data/resource.js';
// @ts-ignore
import {
  resourceConfig,
  libraryOptions,
} from '$amplify/data-config/todo-count';

Amplify.configure(resourceConfig, libraryOptions);

const client = generateClient<Schema>();

export const handler: Handler = async () => {
  const todos = await client.models.Todo.list();
  return todos.data.length;
};
