import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import {
  SecretClient,
  SecretError,
  getSecretClient,
} from '@aws-amplify/backend-secret';
import { randomUUID } from 'node:crypto';
import { BranchBackendIdentifier } from '@aws-amplify/platform-core';
import { SecretResourceProps } from './backend_secret_fetcher_types.js';

const secretClient = getSecretClient();

/**
 * Entry point for the lambda-backend custom resource to retrieve a backend secret.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  console.info(`Received '${event.RequestType}' event`);

  const physicalId =
    event.RequestType === 'Create' ? randomUUID() : event.PhysicalResourceId;
  let data: { secretValue: string } | undefined = undefined;
  if (event.RequestType === 'Update' || event.RequestType === 'Create') {
    const val = await handleCreateUpdateEvent(secretClient, event);
    data = {
      secretValue: val,
    };
  }

  return {
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalId,
    Data: data,
    StackId: event.StackId,
    NoEcho: true,
    Status: 'SUCCESS',
  } as CloudFormationCustomResourceSuccessResponse;
};

/**
 * Handles create/update event for the secret custom resource.
 */
export const handleCreateUpdateEvent = async (
  secretClient: SecretClient,
  event: CloudFormationCustomResourceEvent
): Promise<string> => {
  const props = event.ResourceProperties as unknown as SecretResourceProps;
  let secret: string | undefined;

  try {
    const resp = await secretClient.getSecret(
      new BranchBackendIdentifier(props.backendId, props.branchName),
      {
        name: props.secretName,
      }
    );
    secret = resp?.value;
  } catch (err) {
    const secretErr = err as SecretError;
    if (secretErr.httpStatusCode && secretErr.httpStatusCode >= 500) {
      throw new Error(
        `Failed to retrieve backend secret '${props.secretName}' for '${
          props.backendId
        }/${props.branchName}'. Reason: ${JSON.stringify(err)}`
      );
    }
  }

  // if the secret is not available in branch path, retrieve it at app-level.
  if (!secret) {
    try {
      const resp = await secretClient.getSecret(props.backendId, {
        name: props.secretName,
      });
      secret = resp?.value;
    } catch (err) {
      throw new Error(
        `Failed to retrieve backend secret '${props.secretName}' for '${
          props.backendId
        }'. Reason: ${JSON.stringify(err)}`
      );
    }
  }

  if (!secret) {
    throw new Error(
      `Unable to find backend secret for backend '${props.backendId}', branch '${props.branchName}', name '${props.secretName}'`
    );
  }

  return secret;
};
