import { Construct } from 'constructs';
import {
  BackendDeploymentType,
  BranchBackendIdentifier,
  CDKContextKey,
  SandboxBackendIdentifier,
} from '@aws-amplify/platform-core';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * Populates a unique backend identifier based on CDK context values.
 */
export const getUniqueBackendIdentifier = (
  scope: Construct
): UniqueBackendIdentifier => {
  const backendId = scope.node.getContext(CDKContextKey.BACKEND_ID);
  if (typeof backendId !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_ID} CDK context value is not a string`
    );
  }

  const disambiguator = scope.node.getContext(
    CDKContextKey.BACKEND_DISAMBIGUATOR
  );

  if (typeof disambiguator !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_DISAMBIGUATOR} CDK context value is not a string`
    );
  }

  const deploymentType: BackendDeploymentType = scope.node.getContext(
    CDKContextKey.DEPLOYMENT_TYPE
  );
  const expectedDeploymentTypeValues = [
    BackendDeploymentType.BRANCH,
    BackendDeploymentType.SANDBOX,
  ];

  if (!expectedDeploymentTypeValues.includes(deploymentType)) {
    throw new Error(
      `${
        CDKContextKey.DEPLOYMENT_TYPE
      } CDK context value is not in (${expectedDeploymentTypeValues.join(
        ', '
      )})`
    );
  }

  if (deploymentType === BackendDeploymentType.SANDBOX) {
    return new SandboxBackendIdentifier(backendId, disambiguator);
  }

  return new BranchBackendIdentifier(backendId, disambiguator);
};
