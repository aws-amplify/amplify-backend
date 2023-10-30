import { defineAuth, secret } from '@aws-amplify/backend';
import { myFunc } from '../function.js';
import { secretNames } from '../constants.js';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret(secretNames.googleId),
        clientSecret: secret(secretNames.googleSecret),
      },
      facebook: {
        clientId: secret(secretNames.facebookId),
        clientSecret: secret(secretNames.facebookSecret),
      },
      loginWithAmazon: {
        clientId: secret(secretNames.amazonId),
        clientSecret: secret(secretNames.amazonSecret),
      },
    },
  },
  triggers: {
    postConfirmation: myFunc,
  },
});
