import { defineFunction } from '@aws-amplify/backend';

export const apiFunction = defineFunction({
  name: 'apiFunction',
  entry: '../handler.ts',
  resourceGroupName: 'data',
});
