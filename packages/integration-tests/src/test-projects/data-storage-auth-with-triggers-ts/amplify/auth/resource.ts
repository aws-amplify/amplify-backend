import { defineAuth, secret } from '@aws-amplify/backend';
import { defaultNodeFunc, funcCustomEmailSender } from '../function.js';

const customEmailSenderFunction = {
  handler: funcCustomEmailSender,
};

export const auth = defineAuth({
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
  senders: {
    email: customEmailSenderFunction,
  },
  triggers: {
    postConfirmation: defaultNodeFunc,
  },
  groups: ['Editors', 'Admins'],
});
