'use strict';

const { defineAuth, secret } = require('@aws-amplify/backend');
const { myFunc } = require('../function.cjs');

const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('googleId'),
        clientSecret: secret('googleSecret'),
      },
      facebook: {
        clientId: secret('facebookId'),
        clientSecret: secret('facebookSecret'),
      },
      loginWithAmazon: {
        clientId: secret('amazonId'),
        clientSecret: secret('amazonSecret'),
      },
      callbackUrls: ['https://redirect.com'],
      logoutUrls: ['https://logout.com'],
    },
  },
  triggers: {
    postConfirmation: myFunc,
  },
});

module.exports = { auth };
