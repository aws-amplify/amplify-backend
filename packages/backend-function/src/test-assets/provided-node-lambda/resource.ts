import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { defineFunction } from '../../factory.js';

export const providedNodeLambda = defineFunction((scope) => {
  const functionId = 'providedNodeLambda';
  return new NodejsFunction(scope, functionId, {
    entry:
      './packages/backend-function/src/test-assets/provided-node-lambda/handler.ts',
  });
});
