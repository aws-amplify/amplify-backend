import { Function } from '../src/providers/lambda/function-def';
import { FileStorage } from '../src/providers/s3-provider/file-storage-def';

export const imageResizeLambda = () => {};

export const appStorage = FileStorage({
  triggers: {
    stream: imageResizeLambda,
  },
});

export const myLambda = Function({
  props: {
    handler: 'index.handler',
    runtime: 'nodejs14.x',
    codePath: './source/code',
  },
  runtimeAccess: {
    lambdaRuntime: [appStorage.actions('list', 'read').grant()],
  },
});
