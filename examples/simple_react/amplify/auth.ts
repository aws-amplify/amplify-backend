import { Auth } from '@aws-amplify/backend-auth';
import { secret } from '@aws-amplify/backend';
export const auth = new Auth({
  loginWith: {
    email: true,
  },
});
