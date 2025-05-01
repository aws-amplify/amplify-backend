import {
  defineAuth,
  defineBackend,
  defineFunction,
  secret,
} from '@aws-amplify/backend';
import { data } from './data/resource';
import { App, Stack } from 'aws-cdk-lib';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { BackendIdentifier } from '@aws-amplify/plugin-types';

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

const backendIdentifier: BackendIdentifier = {
  type: 'sandbox',
  name: 'foo',
  namespace: 'bar',
};

const app = new App();

const otherStack = new Stack(app, 'other-stack');

const nodeJsFunction = new NodejsFunction(
  otherStack,
  'some-non-amplify-function',
  {
    entry: path.join(dirname, 'some-function.ts'),
    runtime: Runtime.NODEJS_22_X,
    environment: {
      testSecretPath:
        secret('test').resolvePath(backendIdentifier).branchSecretPath,
    },
  },
);

const amplifyFunc = defineFunction({
  entry: 'some-function.ts',
  environment: {
    testSecret: secret('test'),
  },
});

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    postConfirmation: defineFunction(() => nodeJsFunction),
  },
});

const backend = defineBackend(
  {
    auth,
    data,
    amplifyFunc,
  },
  {
    app,
    backendIdentifier,
  },
);
