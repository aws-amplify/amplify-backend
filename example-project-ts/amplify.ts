import { Auth } from '../src/providers/cognito/auth-def';
import { NoSQLTable } from '../src/providers/dynamodb/table-def';
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

export const users = Auth({
  authorization: {
    allowGuestUsers: true,
  },
  authentication: {
    passwordPolicy: {
      requireLowercase: true,
    },
    signInMethod: ['username'],
    identityProviders: ['login_with_amazon', 'facebook'],
  }
}).triggers({

}).
runtimeAccess({
})() => {})
.authenticatedUserAccess(appStorage.actions('read'))
  triggers: {
    preAuthentication: myLambda.triggerHandler(),
  },
  runtimeAccess: {
    authenticatedUsers: [appStorage.actions('read').grant()],
  },
});
