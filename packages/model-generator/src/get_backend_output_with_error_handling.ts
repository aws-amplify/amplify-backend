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
export const getBackendOutputWithErrorHandling = async (
  backendOutputClient: BackendOutputClient,
  backendIdentifier: DeployedBackendIdentifier
) => {
  try {
    return await backendOutputClient.getOutput(backendIdentifier);
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
    if (
      error instanceof BackendOutputClientError &&
      error.code === BackendOutputClientErrorType.NO_STACK_FOUND
    ) {
      throw new AmplifyUserError(
        'StackDoesNotExistError',
        {
          message: 'Stack does not exist.',
          resolution:
            'Ensure the CloudFormation stack ID or Amplify App ID and branch specified are correct and exists, then re-run this command.',
        },
        error
      );
    }
    if (
      error instanceof BackendOutputClientError &&
      error.code === BackendOutputClientErrorType.CREDENTIALS_ERROR
    ) {
      throw new AmplifyUserError(
        'CredentialsError',
        {
          message: 'Unable to get backend outputs due to invalid credentials.',
          resolution:
            'Ensure your AWS credentials are correctly set and refreshed.',
        },
        error
      );
    }
    if (
      error instanceof BackendOutputClientError &&
      error.code === BackendOutputClientErrorType.ACCESS_DENIED
    ) {
      throw new AmplifyUserError(
        'AccessDeniedError',
        {
          message:
            'Unable to get backend outputs due to insufficient permissions.',
          resolution:
            'Ensure you have permissions to call cloudformation:GetTemplateSummary.',
        },
        error
      );
    }

    throw error;
  }
};
