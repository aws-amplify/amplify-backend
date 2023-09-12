import { Auth } from '@aws-amplify/backend-auth';
import { Func } from '@aws-amplify/backend-function';

export const func = Func.fromDir({ name: 'testFunc', codePath: './func-src' });

export const auth = new Auth({
  loginWith: { email: true },
  triggers: { postAuthentication: func },
});
