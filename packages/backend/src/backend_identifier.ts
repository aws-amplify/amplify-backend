import { Construct } from 'constructs';
import {
  BackendDeploymentType,
  BranchBackendIdentifier,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const backendIdCDKContextKey = 'backend-id';
const branchNameCDKContextKey = 'branch-name';
const deploymentTypeCDKContextKey = 'deployment-type';

/**
 * Populates a unique backend identifier based on CDK context values.
 */
export const getUniqueBackendIdentifier = (
  scope: Construct
): UniqueBackendIdentifier => {
  const backendId = scope.node.getContext(backendIdCDKContextKey);
  const branchName = scope.node.getContext(branchNameCDKContextKey);
  const deploymentType: BackendDeploymentType = scope.node.getContext(
    deploymentTypeCDKContextKey
  );
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
  const expectedDeploymentTypeValues = [
    BackendDeploymentType.BRANCH,
    BackendDeploymentType.SANDBOX,
  ];

  if (!expectedDeploymentTypeValues.includes(deploymentType)) {
    throw new Error(
      `${deploymentTypeCDKContextKey} CDK context value is not in (${expectedDeploymentTypeValues.join(
        ', '
      )})`
    );
  }

  if (deploymentType === BackendDeploymentType.SANDBOX) {
    return new SandboxBackendIdentifier(backendId);
  }

  return new BranchBackendIdentifier(backendId, branchName);
};
