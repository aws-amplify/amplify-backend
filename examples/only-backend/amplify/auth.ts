import { Auth } from 'aws-amplify-backend';

export const auth = new Auth({
  login: {
    via: ['email'],
  },
});
