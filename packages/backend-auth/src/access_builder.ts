import { AuthAccessBuilder } from './types.js';

export const allowAccessBuilder: AuthAccessBuilder = {
  resource: (other) => ({
    to: (actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
    }),
  }),
};
