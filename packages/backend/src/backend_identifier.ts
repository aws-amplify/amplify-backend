import { Construct } from 'constructs';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';

/**
 * Populates a backend identifier based on CDK context values.
 *
 * When CDK context values are present (Amplify CLI path), the identifier is
 * constructed from them. When they are absent (customer-provided CDK App),
 * a standalone identifier is returned using the stack name as the namespace.
 */
export const getBackendIdentifier = (scope: Construct): BackendIdentifier => {
  const backendNamespace = scope.node.tryGetContext(
    CDKContextKey.BACKEND_NAMESPACE,
  );
  const backendName = scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
  const deploymentType: DeploymentType | undefined = scope.node.tryGetContext(
    CDKContextKey.DEPLOYMENT_TYPE,
  );

  // If all context values are present, use the standard Amplify CLI path
  if (
    typeof backendNamespace === 'string' &&
    typeof backendName === 'string' &&
    typeof deploymentType === 'string'
  ) {
    const expectedDeploymentTypeValues = ['sandbox', 'branch', 'standalone'];
    if (!expectedDeploymentTypeValues.includes(deploymentType)) {
      throw new Error(
        `${
          CDKContextKey.DEPLOYMENT_TYPE
        } CDK context value is not in (${expectedDeploymentTypeValues.join(
          ', ',
        )})`,
      );
    }
    return {
      type: deploymentType as DeploymentType,
      namespace: backendNamespace,
      name: backendName,
    };
  }

  // If no context values are set, this is a customer-provided CDK App.
  // Use standalone deployment type — no BranchLinker, no App ID needed.
  return {
    type: 'standalone',
    namespace: scope.node.id || 'amplify',
    name: 'custom',
  };
};
