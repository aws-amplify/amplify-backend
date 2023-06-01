import { defineAuth } from 'aws-amplify-backend';

export default defineAuth({
  login: {
    via: ['email'],
    mfa: true,
    social: {
      // to enable with default settings set to `true`, otherwise provide an object with config
      Google: {
        attributes: {
          preferred_username: 'email',
        },
      },
    },
  },
  /**
   * Override the default Amplify auth configuration
   */
  // override: {},
});
