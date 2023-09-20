import { Auth } from '@aws-amplify/backend-auth';
import { myFunc } from './function.js';

export const auth = new Auth({
  loginWith: {
    email: true,
  },
  triggers: {
    postConfirmation: myFunc,
  },
});
