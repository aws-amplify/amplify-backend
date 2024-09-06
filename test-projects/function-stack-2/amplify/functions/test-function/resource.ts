import { defineFunction } from '@aws-amplify/backend';

export const testFunction = defineFunction({
  resourceGroupName: 'function1'
});

export const myApiFunction = defineFunction({
  name: 'api-function',
  resourceGroupName: 'function2'
});
