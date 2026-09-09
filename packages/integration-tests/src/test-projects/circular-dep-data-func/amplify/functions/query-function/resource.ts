import { defineFunction } from '@aws-amplify/backend';

export const queryFunction = defineFunction({
  name: 'queryFunction',
  entry: '../handler.ts',
  resourceGroupName: 'data',
});
