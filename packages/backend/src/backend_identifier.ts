import { Construct } from 'constructs';
import { CDKContextKey } from '@aws-amplify/platform-core';
import { BackendIdentifier, DeploymentType } from '@aws-amplify/plugin-types';

/**
 * Populates a backend identifier based on CDK context values.
 * Falls back to standalone mode only when no context keys are set at all.
 * Throws on partial context.
 */
export const getBackendIdentifier = (scope: Construct): BackendIdentifier => {
  const backendNamespace = scope.node.tryGetContext(
    CDKContextKey.BACKEND_NAMESPACE,
  );
  const backendName = scope.node.tryGetContext(CDKContextKey.BACKEND_NAME);
  const deploymentType: DeploymentType | undefined = scope.node.tryGetContext(
    CDKContextKey.DEPLOYMENT_TYPE,
  );

  const hasNamespace = typeof backendNamespace === 'string';
  const hasName = typeof backendName === 'string';
  const hasType = typeof deploymentType === 'string';

  // All context present — standard Amplify CLI path.
  if (hasNamespace && hasName && hasType) {
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

  // No context at all — standalone fallback for pure `cdk deploy` usage.
  if (!hasNamespace && !hasName && !hasType) {
    const nodeId = scope.node.id;
    return {
      type: 'standalone',
      namespace: nodeId || 'amplify',
      name: 'default',
    };
  }

  // Partial context — throw for the first missing key.
  if (!hasNamespace) {
    throw new Error(
      `No context value present for ${CDKContextKey.BACKEND_NAMESPACE} key`,
    );
  }
  if (!hasName) {
    throw new Error(
      `No context value present for ${CDKContextKey.BACKEND_NAME} key`,
    );
  }
  // !hasType
  throw new Error(
    `No context value present for ${CDKContextKey.DEPLOYMENT_TYPE} key`,
  );
};
