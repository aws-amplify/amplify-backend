import { defineAuth } from 'aws-amplify-backend';

export default defineAuth({
  login: {
    via: ['email'],
  },
});
