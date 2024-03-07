import { AuthAccessBuilder } from './types.js';

export const authAccessBuilder: AuthAccessBuilder = {
  resource: (grantee) => ({
    to: (actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        grantee.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
    }),
  }),
};
