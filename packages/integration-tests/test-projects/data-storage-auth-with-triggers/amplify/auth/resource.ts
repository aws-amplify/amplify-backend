import { defineAuth } from '@aws-amplify/backend-auth';
import { myFunc } from '../function.js';
import { secretNames } from '../constants.js';
import { secret } from '@aws-amplify/backend';

export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret(secretNames.googleId),
        clientSecretValue: secret(secretNames.googleSecret),
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
