import { defineFunction } from '@aws-amplify/backend';

export const defaultNodeFunc = defineFunction({
  entry: './func-src/handler.ts',
});
