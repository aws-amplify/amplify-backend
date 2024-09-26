import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';

/**
 * Entry point for the lambda-backend custom resource to retrieve a backend secret.
 */
export const handler = async (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  console.info(`Received '${event.RequestType}' event`);

  const physicalId =
    event.RequestType === 'Create' ? randomUUID() : event.PhysicalResourceId;
  let data: { allowUnauthenticatedIdentities: boolean } | undefined = undefined;
  if (event.RequestType === 'Update' || event.RequestType === 'Create') {
    //   const val = await handleCreateUpdateEvent();
    data = {
      allowUnauthenticatedIdentities: true,
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
export const handleCreateUpdateEvent =
  async (): // event: CloudFormationCustomResourceEvent
  Promise<string> => {
    // const props = event.ResourceProperties;

    return 'secret';
  };
