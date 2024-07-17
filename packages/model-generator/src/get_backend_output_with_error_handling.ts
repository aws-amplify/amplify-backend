import {
  BackendOutputClient,
  BackendOutputClientError,
  BackendOutputClientErrorType,
  DeployedBackendIdentifier,
} from '@aws-amplify/deployed-backend-client';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 * Common Error handling for BackendOutputClient.getOutput() in model-generator package.
 */
export const getBackendOutputWithErrorHandling = (
  backendOutputClient: BackendOutputClient,
  backendIdentifier: DeployedBackendIdentifier
) => {
  try {
    return backendOutputClient.getOutput(backendIdentifier);
  } catch (error) {
    if (
      error instanceof BackendOutputClientError &&
      error.code === BackendOutputClientErrorType.DEPLOYMENT_IN_PROGRESS
    ) {
      throw new AmplifyUserError(
        'DeploymentInProgressError',
        {
          message: 'Deployment is currently in progress.',
          resolution: 'Re-run this command once the deployment completes.',
        },
        error
      );
    }
    throw error;
  }
};
