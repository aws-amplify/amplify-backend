import { defineFunction } from '@aws-amplify/backend';

export const todoCount = defineFunction({
  name: 'todo-count',
  entry: './handler.ts',
  timeoutSeconds: 30,
});
