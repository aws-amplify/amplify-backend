import { Construct } from 'constructs';
import {
  BackendDeploymentType,
  CDKContextKey,
} from '@aws-amplify/platform-core';
import { BackendIdentifierParts } from '@aws-amplify/plugin-types';

/**
 * Populates a unique backend identifier based on CDK context values.
 */
export const getBackendIdentifierParts = (
  scope: Construct
): BackendIdentifierParts => {
  const backendId = scope.node.getContext(CDKContextKey.BACKEND_NAMESPACE);
  if (typeof backendId !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_NAMESPACE} CDK context value is not a string`
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
    return {
      type: 'sandbox',
      namespace: backendId,
      instance: disambiguator,
    };
  }

  return {
    type: 'branch',
    namespace: backendId,
    instance: disambiguator,
  };
};
