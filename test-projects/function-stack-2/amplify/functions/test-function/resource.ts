import { defineFunction, defineStack } from '@aws-amplify/backend';

const stack1 = defineStack('awesome-stack1');
const stack2 = defineStack('awesome-stack2');


export const testFunction = defineFunction({scope: stack1});

export const myApiFunction = defineFunction({
  name: 'api-function',
  scope: stack2
});
