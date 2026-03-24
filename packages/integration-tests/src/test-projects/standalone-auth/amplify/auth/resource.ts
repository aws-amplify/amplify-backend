import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    webAuthn: {
      relyingPartyId: 'app.example.com',
    },
  },
});
