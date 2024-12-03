import { defineFunction } from '@aws-amplify/backend';

export const nodeFunc = defineFunction({
  name: 'nodeFunction',
  entry: './func-src/handler.ts',
  timeoutSeconds: 5,
});
