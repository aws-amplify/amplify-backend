import { NoSQLTable, FileStorage, Function } from './types-experiment';

const myTable = NoSQLTable({
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
});

const myLambda = Function({
  handler: 'index.handler',
  runtime: 'nodejs14.x',
  codePath: './source/code',
  runtimeAccess: {
    lambdaRuntime: [myTable.actions('create', 'update').grant()],
  },
});

const myFileStoreage = FileStorage({
  enforceSSL: true,
  bpa: true,
  triggers: {
    stream: myLambda.eventHandler(),
  },
});

export const resources = {
  myTable,
  myLambda,
  myFileStoreage,
};
