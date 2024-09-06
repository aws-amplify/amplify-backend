import { defineFunction } from '@aws-amplify/backend';

export const testFunction = defineFunction();

export const myApiFunction = defineFunction({
  name: 'api-function',
});
