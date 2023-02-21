import { Auth } from '../src/providers/cognito/auth-def';
import { NoSQLTable } from '../src/providers/dynamodb/table-def';
import { Function } from '../src/providers/lambda/function-def';
import { FileStorage } from '../src/providers/s3-provider/file-storage-def';

const myTable = NoSQLTable({
  props: {
    primaryKey: {
      name: 'pk',
      type: 'S',
    },
    sortKey: {
      name: 'sk',
      type: 'S',
    },
    readCapacity: 6,
    writeCapacity: 10,
    secondaryIndexes: [
      {
        indexName: 'anotherIndex',
        primaryKey: {
          name: 'otherName',
        },
      },
    ],
  },
});

const myLambda = Function({
  props: {
    handler: 'index.handler',
    runtime: 'nodejs14.x',
    codePath: './source/code',
  },
  runtimeAccess: {
    lambdaRuntime: [myTable.actions('create').grant()],
  },
});

const myFileStoreage = FileStorage({
  props: {
    enforceSSL: true,
    bpa: true,
  },
  triggers: {
    stream: myLambda,
  },
});

const myAuth = Auth({
  props: {
    authorization: {
      allowGuestUsers: true,
    },
    authentication: {
      passwordPolicy: {
        requireLowercase: true,
      },
      signInMethod: ['username'],
      identityProviders: ['facebook'],
    },
  },
  triggers: {
    preAuthentication: myLambda,
  },
  runtimeAccess: {
    authenticatedUsers: [myFileStoreage.actions('read').grant()],
  },
});

export const resources = {
  myTable,
  myLambda,
  myFileStoreage,
  myAuth,
};
