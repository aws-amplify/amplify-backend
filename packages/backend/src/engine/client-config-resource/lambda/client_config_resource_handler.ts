import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import { AmplifyClientConfigCustomResourceProps } from './client_config_resource_handler_types.js';
import { generateClientConfig } from '@aws-amplify/client-config';

/**
 * Handles custom resource events.
 */
export class AmplifyClientConfigCustomResourceEventHandler {
  /**
   * Creates the custom resource events handler.
   */
  constructor() {}

  handleCustomResourceEvent = async (
    event: CloudFormationCustomResourceEvent,
  ): Promise<CloudFormationCustomResourceSuccessResponse> => {
    console.info(`Received '${event.RequestType}' event`);

    const physicalId =
      event.RequestType === 'Create' ? randomUUID() : event.PhysicalResourceId;

    const props =
      event.ResourceProperties as unknown as AmplifyClientConfigCustomResourceProps;

    let clientConfigJSON: string | undefined;
    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        console.info(
          `Generating client config for stackId=${props.stackId},stackName=${props.stackName}`,
        );
        clientConfigJSON = JSON.stringify(
          await generateClientConfig({ stackName: props.stackName }, '1.4'),
        );
        break;
      case 'Delete':
        // No-op
        break;
    }

    console.info(`Client config: ${clientConfigJSON}`);

    return {
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: physicalId,
      StackId: event.StackId,
      Status: 'SUCCESS',
      Data: {
        clientConfigJSON,
      },
    } as CloudFormationCustomResourceSuccessResponse;
  };
}

const customResourceEventHandler =
  new AmplifyClientConfigCustomResourceEventHandler();

/**
 * Entry point for the lambda-backend custom resource to link deployment to branch.
 */
export const handler = (
  event: CloudFormationCustomResourceEvent,
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  return customResourceEventHandler.handleCustomResourceEvent(event);
};
