import { Construct } from 'constructs';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';

/**
 * Populates a backend identifier based on CDK context values.
 */
export const getBackendIdentifier = (scope: Construct): BackendIdentifier => {
  const backendNamespace = scope.node.getContext(
    CDKContextKey.BACKEND_NAMESPACE
  );
  if (typeof backendNamespace !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_NAMESPACE} CDK context value is not a string`
    );
  }

  const backendName = scope.node.getContext(CDKContextKey.BACKEND_NAME);

  if (typeof backendName !== 'string') {
    throw new Error(
      `${CDKContextKey.BACKEND_NAME} CDK context value is not a string`
    );
  }

  const deploymentType: DeploymentType = scope.node.getContext(
    CDKContextKey.DEPLOYMENT_TYPE
  );
  const expectedDeploymentTypeValues = ['sandbox', 'branch'];

  if (!expectedDeploymentTypeValues.includes(deploymentType)) {
    throw new Error(
      `${
        CDKContextKey.DEPLOYMENT_TYPE
      } CDK context value is not in (${expectedDeploymentTypeValues.join(
        ', '
      )})`
    );
  }

  return {
    type: deploymentType,
    namespace: backendNamespace,
    name: backendName,
  };
};
