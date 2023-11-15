import {
  CloudFormationCustomResourceEvent,
  CloudFormationCustomResourceSuccessResponse,
} from 'aws-lambda';
import { randomUUID } from 'node:crypto';
import {
  AmplifyClient,
  Branch,
  GetBranchCommand,
  NotFoundException,
  UpdateBranchCommand,
  UpdateBranchCommandInput,
} from '@aws-sdk/client-amplify';
import { AmplifyBranchLinkerCustomResourceProps } from './branch_linker_types.js';

/**
 * Handles custom resource events.
 */
export class AmplifyBranchLinkerCustomResourceEventHandler {
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
      event.ResourceProperties as unknown as AmplifyBranchLinkerCustomResourceProps;

    switch (event.RequestType) {
      case 'Create':
      case 'Update':
        console.info(
          `Setting stack reference for appId=${props.appId},branchName=${props.branchName} to ${event.StackId}`
        );
        await this.updateOrUnsetStackReference(
          props.appId,
          props.branchName,
          event.StackId
        );
        break;
      case 'Delete':
        console.info(
          `Un-setting stack reference for appId=${props.appId},branchName=${props.branchName}`
        );
        try {
          await this.updateOrUnsetStackReference(
            props.appId,
            props.branchName,
            undefined
          );
        } catch (e) {
          if (e instanceof NotFoundException) {
            console.info(
              `Branch branchName=${props.branchName} of appId=${props.appId} was not found while handling delete event`
            );
          } else {
            throw e;
          }
        }
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
    // Stack id is in ARN format.
    if (stackId && !stackId?.startsWith('arn:')) {
      throw new Error(`Provided stackId ${stackId} is not in ARN format`);
    }

    const branch: Branch = await this.getBranch(appId, branchName);
    console.info(`Received branch details ${JSON.stringify(branch)}`);
    // Populate update command input with existing values, so we don't lose them.
    const updateBranchCommandInput: UpdateBranchCommandInput = {
      appId,
      ...branch,
    };

    // This is a known bug in the service. I.e. branch can be created without stage
    // but service returns 'NONE' instead of undefined which is not part of
    // Stage enum...
    if ((updateBranchCommandInput.stage as string) === 'NONE') {
      updateBranchCommandInput.stage = undefined;
    }

    // Set or unset stackId
    if (stackId) {
      if (!updateBranchCommandInput.backend) {
        updateBranchCommandInput.backend = {};
      }
      updateBranchCommandInput.backend.stackArn = stackId;
    } else {
      if (updateBranchCommandInput.backend?.stackArn) {
        delete updateBranchCommandInput.backend.stackArn;
      }
    }

    console.info(
      `Sending branch update ${JSON.stringify(updateBranchCommandInput)}`
    );
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
      throw new Error(`Unable to get branch ${branchName} for app ${appId}`);
    }
    return branch;
  };
}

const customResourceEventHandler =
  new AmplifyBranchLinkerCustomResourceEventHandler(new AmplifyClient());

/**
 * Entry point for the lambda-backend custom resource to link deployment to branch.
 */
export const handler = (
  event: CloudFormationCustomResourceEvent
): Promise<CloudFormationCustomResourceSuccessResponse> => {
  return customResourceEventHandler.handleCustomResourceEvent(event);
};
