'use strict';

const { defineAuth, secret } = require('@aws-amplify/backend');
const { myFunc } = require('../function.cjs');
const { secretNames } = require('../constants.cjs');

const auth = defineAuth({
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

module.exports = { auth };
