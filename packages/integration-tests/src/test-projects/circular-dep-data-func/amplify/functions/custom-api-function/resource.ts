import { defineFunction } from '@aws-amplify/backend';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import path from 'path';
import { fileURLToPath } from 'url';

export const customAPIFunction = defineFunction(
  (scope) => {
    return new NodejsFunction(scope, 'customAPIFunction', {
      entry: path.resolve(fileURLToPath(import.meta.url), '..', 'handler.ts'),
      environment: {
        TEST_ENV: 'test env value',
      },
    });
  },
  {
    resourceGroupName: 'data',
  },
);
