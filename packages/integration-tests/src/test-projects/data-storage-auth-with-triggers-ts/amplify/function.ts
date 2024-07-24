import { defineFunction, secret } from '@aws-amplify/backend';
import { amplifySharedSecretNameKey } from '../../../shared_secret.js';

export const defaultNodeFunc = defineFunction({
  name: 'defaultNodeFunction',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(
      process.env[amplifySharedSecretNameKey] as string
    ),
  },
  timeoutSeconds: 5,
});

export const node16Func = defineFunction({
  name: 'node16Function',
  entry: './func-src/handler_node16.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(
      process.env[amplifySharedSecretNameKey] as string
    ),
  },
  timeoutSeconds: 5,
  runtime: 16,
});

export const onDelete = defineFunction({
  name: 'onDelete',
  entry: './func-src/handler.ts',
});
export const onUpload = defineFunction({
  name: 'onUpload',
  entry: './func-src/handler.ts',
});

export const funcWithSsm = defineFunction({
  name: 'funcWithSsm',
  entry: './func-src/handler_with_ssm.ts',
});

export const funcWithAwsSdk = defineFunction({
  name: 'funcWithAwsSdk',
  entry: './func-src/handler_with_aws_sdk.ts',
});

export const funcWithSchedule = defineFunction({
  name: 'funcWithSchedule',
  entry: './func-src/handler_with_aws_sqs.ts',
  schedule: '* * * * ?',
});
