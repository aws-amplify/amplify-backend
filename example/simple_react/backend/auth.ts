import { Auth } from '@aws-amplify/construct-auth';

export const auth = new Auth({
  loginMechanisms: ['email'],
});
