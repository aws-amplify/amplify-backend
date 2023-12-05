import { defineFunction } from '@aws-amplify/backend';

export const myFunc = defineFunction({
  entry: './func-src/handler.js',
});
