import { defineFunction, secret } from '@aws-amplify/backend';

export const myFunc = defineFunction({
  name: 'specialTestFunction',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
  },
});
