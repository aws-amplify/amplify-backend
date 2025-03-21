import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { defineFunction } from '../../factory.js';
import path from 'path';
import { fileURLToPath } from 'url';

export const providedNodeLambda = defineFunction((scope) => {
  return new NodejsFunction(scope, 'providedNodeLambda', {
    entry: path.resolve(fileURLToPath(import.meta.url), '..', 'handler.js'),
  });
});
