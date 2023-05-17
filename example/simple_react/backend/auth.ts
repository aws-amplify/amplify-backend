import { Auth } from '@aws-amplify/construct-auth';

export const auth = new Auth(null, 'my-auth', {
  loginMechanisms: ['email'],
});
