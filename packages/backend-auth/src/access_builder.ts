import { AllowAccessBuilder } from './types.js';

export const allowAccessBuilder: AllowAccessBuilder = {
  resource: (other) => ({
    to: (actions) => ({
      getResourceAccessAcceptor: (getInstanceProps) =>
        other.getInstance(getInstanceProps).getResourceAccessAcceptor(),
      actions,
    }),
  }),
};
