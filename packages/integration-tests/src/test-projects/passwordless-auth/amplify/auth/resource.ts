import { defineAuth } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
  },
  passwordlessAuth: {
    // originationNumber and fromAddress values are placeholders
    // until we find a solution to add them to work with CI.
    otp: {
      sms: { originationNumber: '+18888888888' },
      email: {
        fromAddress: 'dummy@email.com',
      },
    },
    magicLink: {
      allowedOrigins: ['http://localhost:3000/'],
      email: { fromAddress: 'dummy@email.com' },
    },
  },
});
