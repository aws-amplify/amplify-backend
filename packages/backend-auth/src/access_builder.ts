import { AuthAccessBuilder } from './types.js';

export const allowAccessBuilder: AuthAccessBuilder = {
  resource: (grantee) => ({
    to: (actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
    }),
  }),
};
