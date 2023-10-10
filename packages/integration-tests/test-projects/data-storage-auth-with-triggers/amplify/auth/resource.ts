import { defineAuth } from '@aws-amplify/backend-auth';
import { myFunc } from '../function.js';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  triggers: {
    postConfirmation: myFunc,
  },
});
