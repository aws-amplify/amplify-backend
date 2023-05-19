import { Auth } from '@aws-amplify/backend-auth';

export const auth = new Auth({
  loginMechanisms: ['email'],
});
