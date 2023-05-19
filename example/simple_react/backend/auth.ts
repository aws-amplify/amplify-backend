import { Auth } from '@aws-amplify/backend';

export const auth = new Auth({
  loginMechanisms: ['email'],
});
