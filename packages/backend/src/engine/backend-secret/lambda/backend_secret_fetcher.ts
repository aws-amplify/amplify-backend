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
  let data: Record<string, string> | undefined = undefined;
  if (event.RequestType === 'Update' || event.RequestType === 'Create') {
    const secretMap = await handleCreateUpdateEvent(secretClient, event);
    data = {
      ...secretMap,
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
): Promise<Record<string, string>> => {
  const props = event.ResourceProperties as unknown as SecretResourceProps;
  const secretMap: Record<string, string> = {};
  for (const secretName of props.secretNames) {
    let secretValue: string | undefined = undefined;
    try {
      const resp = await secretClient.getSecret(
        {
          namespace: props.namespace,
          name: props.name,
          type: props.type,
        },
        {
          name: secretName,
        }
      );
      secretValue = resp.value;
    } catch (err) {
      const secretErr = err as SecretError;
      if (secretErr.httpStatusCode && secretErr.httpStatusCode >= 500) {
        throw new Error(
          `Failed to retrieve backend secret '${secretName}' for '${
            props.namespace
          }/${props.name}'. Reason: ${JSON.stringify(err)}`
        );
      }
    }

    // if the secret is not available in branch path, try retrieving it at the app-level.
    if (!secretValue) {
      try {
        const resp = await secretClient.getSecret(props.namespace, {
          name: secretName,
        });
        secretValue = resp.value;
      } catch (err) {
        throw new Error(
          `Failed to retrieve backend secret '${secretName}' for '${
            props.namespace
          }'. Reason: ${JSON.stringify(err)}`
        );
      }
    }

    if (!secretValue) {
      throw new Error(
        `Unable to find backend secret for backend '${props.namespace}', branch '${props.name}', name '${secretName}'`
      );
    }

    // store the secret->secretValue pair in the secret map
    secretMap[secretName] = secretValue;
  }

  return secretMap;
};
