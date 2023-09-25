import { Construct } from 'constructs';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const backendIdCDKContextKey = 'backend-id';
const branchNameCDKContextKey = 'branch-name';

/**
 * Populates a unique backend identifier based on CDK context values.
 */
export const getUniqueBackendIdentifier = (
  scope: Construct
): UniqueBackendIdentifier => {
  const backendId = scope.node.getContext(backendIdCDKContextKey);
  const branchName = scope.node.getContext(branchNameCDKContextKey);
  if (typeof backendId !== 'string') {
    throw new Error(
      `${backendIdCDKContextKey} CDK context value is not a string`
    );
  }
  if (typeof branchName !== 'string') {
    throw new Error(
      `${branchNameCDKContextKey} CDK context value is not a string`
    );
  }
  return {
    backendId,
    branchName,
  };
};
