import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import {
  AmplifyClient,
  Branch,
  GetBranchCommand,
  UpdateBranchCommand,
  UpdateBranchCommandInput,
} from '@aws-sdk/client-amplify';
import { AmplifyConsoleLinkerCustomResourceProps } from './amplify_console_linker_types.js';

/**
 * Handles custom resource events.
 */
export class AmplifyConsoleLinkerCustomResourceEventHandler {
  /**
   * Creates the custom resource events handler.
   */
  constructor(private readonly amplifyClient: AmplifyClient) {}

  handleCustomResourceEvent = async (
    event: CloudFormationCustomResourceEvent
  ): Promise<CloudFormationCustomResourceSuccessResponse> => {
    console.info(`Received '${event.RequestType}' event`);

    const physicalId =
      event.RequestType === 'Create' ? randomUUID() : event.PhysicalResourceId;

    const props =
      event.ResourceProperties as unknown as AmplifyConsoleLinkerCustomResourceProps;

    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        await this.updateOrUnsetStackReference(
          props.backendId,
          props.branchName,
          event.StackId
        );
        break;
      case 'Delete':
        await this.updateOrUnsetStackReference(
          props.backendId,
          props.branchName,
          undefined
        );
        break;
    }

    return {
      RequestId: event.RequestId,
      LogicalResourceId: event.LogicalResourceId,
      PhysicalResourceId: physicalId,
      StackId: event.StackId,
      Status: 'SUCCESS',
    } as CloudFormationCustomResourceSuccessResponse;
  };

  private updateOrUnsetStackReference = async (
    appId: string,
    branchName: string,
    stackId: string | undefined
  ): Promise<void> => {
    const branch: Branch = await this.getBranch(appId, branchName);
    // Populate update command input with existing values, so we don't lose them.
    const updateBranchCommandInput: UpdateBranchCommandInput = {
      appId,
      ...branch,
    };

    if (!updateBranchCommandInput.stage) {
      // This is a known bug in the service. I.e. branch can be created without stage
      // but can't be updated without it.
      updateBranchCommandInput.stage = 'PRODUCTION';
    }

    // Stack id is in ARN format.
    // TODO: do something with this thing.
    console.log(stackId);

    await this.amplifyClient.send(
      new UpdateBranchCommand(updateBranchCommandInput)
    );
  };

  private getBranch = async (
    appId: string,
    branchName: string
  ): Promise<Branch> => {
    const branch: Branch | undefined = (
      await this.amplifyClient.send(new GetBranchCommand({ appId, branchName }))
    ).branch;
    if (!branch) {
      throw new Error(
        `Unable to get or create branch ${branchName} for app ${appId}`
      );
    }
    return branch;
  };
}

const customResourceEventHandler =
  new AmplifyConsoleLinkerCustomResourceEventHandler(new AmplifyClient());

/**
 * Entry point for the lambda-backend custom resource to link deployment to branch.
 */
export const handler = (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  return customResourceEventHandler.handleCustomResourceEvent(event);
};
