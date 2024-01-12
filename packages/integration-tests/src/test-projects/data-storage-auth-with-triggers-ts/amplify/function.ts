import { defineFunction, secret } from '@aws-amplify/backend';

export const myFunc = defineFunction({
  name: 'specialTestFunction',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(process.env.AMPLIFY_SHARED_SECRET_NAME as string),
  },
});
