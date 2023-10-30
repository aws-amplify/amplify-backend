import { Func } from '@aws-amplify/backend';

export const myFunc = Func.fromDir({
  name: 'testFunc',
  codePath: './func-src',
});
