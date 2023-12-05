import { defineFunction } from '@aws-amplify/backend';

export const myFunc = defineFunction({
  name: 'specialTestFunction',
  entry: './func-src/handler.ts',
});
