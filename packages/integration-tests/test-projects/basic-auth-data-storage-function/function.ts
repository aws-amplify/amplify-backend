import { Func } from '@aws-amplify/backend-function';

export const myFunc = new Func({
  name: 'testFunc',
  codeLocation: './func-src',
});
