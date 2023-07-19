import { Func } from '@aws-amplify/backend-function';

export const myFunc = Func.fromDir({
  name: 'testFunc',
  codePath: './func-src',
});
