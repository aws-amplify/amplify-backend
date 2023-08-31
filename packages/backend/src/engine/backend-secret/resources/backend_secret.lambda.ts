/* eslint-disable no-console */
import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
  Context,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  Secret,
  SecretClient,
  SecretServerError,
} from '@aws-amplify/client-config';

type SecretResourceProps = {
  backendId: string;
  branchName: string;
  secretName: string;
  // eslint-disable-next-line  @typescript-eslint/naming-convention
  ServiceToken: string;
};

/**
 * Entry point for the lambda-backend custom resource to retrieve a backend secret.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context // eslint-disable-line @typescript-eslint/no-unused-vars
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  console.info(`Received '${event.RequestType}' event`);

  const secretClient = SecretClient();
  const physicalId =
    event.RequestType === 'Create' ? uuidv4() : event.PhysicalResourceId;
  let data: { [key: string]: string } | undefined = undefined;
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
  secretClient: Secret,
  event: CloudFormationCustomResourceEvent
): Promise<string> => {
  const props = event.ResourceProperties as SecretResourceProps;
  let secret: string | undefined;

  try {
    secret = await secretClient.getSecret(
      props.backendId,
      props.secretName,
      props.branchName
    );
  } catch (err) {
    if (err instanceof SecretServerError) {
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
      secret = await secretClient.getSecret(props.backendId, props.secretName);
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
