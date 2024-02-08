import { defineFunction, secret } from '@aws-amplify/backend';
import { amplifySharedSecretNameKey } from '../../../shared_secret.js';

export const myFunc = defineFunction({
  name: 'defaultNodeFunction',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(
      process.env[amplifySharedSecretNameKey] as string
    ),
  },
});

export const node16Func = defineFunction({
  name: 'node16Function',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(
      process.env[amplifySharedSecretNameKey] as string
    ),
  },
  runtime: 16,
});
