/* eslint-disable no-console */
import {
  CloudFormationCustomResourceEvent,
  Context,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import {
  Secret,
  SecretClient,
  SecretServerError,
} from '@aws-amplify/client-config';

interface ParameterResourceProps {
  backendId: string;
  branchName: string;
  parameterName: string;
  // eslint-disable-next-line  @typescript-eslint/naming-convention
  ServiceToken: string;
}

/**
 * Entry point for the lambda-backend custom resource to retrieve a backend parameter.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  console.info(`Received '${event.RequestType}' event`);

  const secretClient = SecretClient();
  const physicalId =
    event.RequestType === 'Create' ? uuidv4() : event.PhysicalResourceId;
  let data: { [key: string]: string } | undefined = undefined;
  if (event.RequestType === 'Update' || event.RequestType === 'Create') {
    const val = await handleCreateUpdateEvent(secretClient, event);
    data = {
      paramValue: val,
    };
  }

  return {
    RequestId: event.RequestId,
    LogicalResourceId: event.LogicalResourceId,
    PhysicalResourceId: physicalId,
    Data: data,
    StackId: event.StackId,
    Status: 'SUCCESS',
  };
};

/**
 * Handles create/update event for the backend parameter's custom resource.
 */
export const handleCreateUpdateEvent = async (
  secretClient: Secret,
  event: CloudFormationCustomResourceEvent
): Promise<string> => {
  const props = event.ResourceProperties as ParameterResourceProps;
  let secret: string | undefined;

  try {
    secret = await secretClient.getSecret(
      props.backendId,
      props.parameterName,
      props.branchName
    );
  } catch (err) {
    if (err instanceof SecretServerError) {
      throw new Error(
        `Failed to retrieve backend parameter '${props.parameterName}' for '${
          props.backendId
        }/${props.branchName}'. Reason: ${JSON.stringify(err)}`
      );
    }
  }

  // if the secret is not available in branch path, retrieve it at app-level.
  if (!secret) {
    try {
      secret = await secretClient.getSecret(
        props.backendId,
        props.parameterName
      );
    } catch (err) {
      throw new Error(
        `Failed to retrieve backend parameter '${props.parameterName}' for '${
          props.backendId
        }'. Reason: ${JSON.stringify(err)}`
      );
    }
  }

  if (!secret) {
    throw new Error(
      `Unable to find backend parameter for backend '${props.backendId}', branch '${props.branchName}', name '${props.parameterName}'`
    );
  }

  return secret;
};
