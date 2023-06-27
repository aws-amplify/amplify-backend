import { Backend } from '@aws-amplify/backend';
import { Storage } from '@aws-amplify/backend-storage';
import { Auth } from '@aws-amplify/backend-auth';

export const auth = new Auth({
  loginMechanisms: ['email'],
});
export const storage = new Storage({});

new Backend({
  auth,
  storage,
});
