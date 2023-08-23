import { AmplifyAuthProps } from './types.js';
/**
 * If property is defined in the customer's props, we take their property, otherwise we use the defaults.
 */
export const DEFAULT_AUTH_PROPS: AmplifyAuthProps = {
  loginOptions: {
    basic: {
      email: {
        enabled: true,
      },
      phoneNumber: {
        enabled: false,
      },
    },
  },
};
