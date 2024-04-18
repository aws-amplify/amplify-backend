import { AmplifyUserError } from '../errors';

/**
 * Validates that the resource name doesn't have invalid characters or starts with a number
 */
export const validateResourceName = (resourceName: string): void => {
  if (!/^[a-zA-Z][a-zA-Z0-9-_ ]*$/.test(resourceName)) {
    throw new AmplifyUserError('InvalidResourceNameError', {
      message: `Resource name contains invalid characters, found ${resourceName}`,
      resolution:
        'Update name to use only alphanumeric characters, dashes, underscores and spaces. The name should also start with an alphabet',
    });
  }
};
