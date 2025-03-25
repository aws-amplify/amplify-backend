import { defineFunction, secret } from '@aws-amplify/backend';
import { amplifySharedSecretNameKey } from '../../../shared_secret.js';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const defaultNodeFunc = defineFunction({
  name: 'defaultNodeFunction',
  entry: './func-src/handler.ts',
  environment: {
    TEST_SECRET: secret('amazonSecret'),
    TEST_SHARED_SECRET: secret(
      process.env[amplifySharedSecretNameKey] as string,
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
      process.env[amplifySharedSecretNameKey] as string,
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

export const customAPIFunction = defineFunction(
  (scope) => {
    return new NodejsFunction(scope, 'customAPIFunction', {
      entry: path.resolve(
        fileURLToPath(import.meta.url),
        '..',
        'func-src',
        'handler_provided.ts',
      ),
      environment: {
        TEST_ENV: 'test env value',
      },
    });
  },
  {
    resourceGroupName: 'data',
  },
);
