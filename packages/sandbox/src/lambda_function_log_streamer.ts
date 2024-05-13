import { functionOutputKey } from '@aws-amplify/backend-output-schemas';
import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import {
  BackendIdentifierConversions,
  TagName,
} from '@aws-amplify/platform-core';
import { BackendIdentifier, BackendOutput } from '@aws-amplify/plugin-types';
import {
  CloudFormationClient,
  DescribeStacksCommand,
} from '@aws-sdk/client-cloudformation';
import { LambdaClient, ListTagsCommand } from '@aws-sdk/client-lambda';
import { Arn, ArnFormat } from 'aws-cdk-lib';
import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';

/**
 * Logs streamer for customer defined lambda functions in a sandbox.
 */
export class LambdaFunctionLogStreamer {
  /**
   * Creates an instance of LambdaFunctionLogStreamer
   */
  constructor(
    private readonly lambda: LambdaClient,
    private readonly cfnClient: CloudFormationClient,
    private readonly logsMonitor: CloudWatchLogEventMonitor,
    private readonly backendOutputClient: BackendOutputClient,
    private readonly printer: Printer
  ) {}

  setOutputLocation = (outputLocation: string) => {
    this.logsMonitor.setOutputLocation(outputLocation);
  };

  /**
   * Starts watching logs in the given sandbox.
   * @param sandboxBackendId The sandbox backend identifier.
   * @param functionNamesToFilter The function names to filter.
   */
  startWatchingLogs = async (
    sandboxBackendId: BackendIdentifier,
    functionNamesToFilter?: string[]
  ) => {
    const backendOutput: BackendOutput =
      await this.backendOutputClient.getOutput(sandboxBackendId);

    const definedFunctionsPayload =
      backendOutput[functionOutputKey]?.payload.definedFunctions;
    const deployedFunctionNames = definedFunctionsPayload
      ? (JSON.parse(definedFunctionsPayload) as string[])
      : [];

    // To use list-tags API we need to convert function name to function Arn since it only accepts ARN as input
    const deployedFunctionNameToArnMap = await this.getFunctionArnFromNames(
      sandboxBackendId,
      deployedFunctionNames
    );

    if (!deployedFunctionNameToArnMap) {
      this.printer.log(
        `[Sandbox] Could not find any function in stack ${BackendIdentifierConversions.toStackName(
          sandboxBackendId
        )}. Streaming function logs will be turned off.`,
        LogLevel.DEBUG
      );
      return;
    }

    for (const entry of deployedFunctionNameToArnMap) {
      const listTagsResponse = await this.lambda.send(
        new ListTagsCommand({
          Resource: entry.arn,
        })
      );
      const friendlyFunctionName =
        listTagsResponse.Tags?.[TagName.FRIENDLY_NAME];
      if (!friendlyFunctionName) {
        this.printer.log(
          `[Sandbox] Could not find user defined name for lambda function ${entry.name}. Logs will not be streamed for this function.`,
          LogLevel.DEBUG
        );
        continue;
      }

      if (
        !functionNamesToFilter ||
        functionNamesToFilter.includes(friendlyFunctionName)
      ) {
        this.logsMonitor?.addLogGroups(
          friendlyFunctionName,
          // a CW log group is implicitly created for each lambda function with the lambda function's name
          `/aws/lambda/${entry.name}`
        );
        this.printer.log(
          `[Sandbox] Logs for function ${friendlyFunctionName} will be streamed.`,
          LogLevel.DEBUG
        );
      } else {
        this.printer.log(
          `[Sandbox] Skipping logs streaming for function ${friendlyFunctionName}. To stream logs for this function, provide its name in --function-name option`,
          LogLevel.DEBUG
        );
      }
    }

    // finally start listening
    this.logsMonitor?.activate();
  };

  stopWatchingLogs = () => {
    this.printer.log(
      `[Sandbox] Streaming function logs will be paused during the deployment and will be resumed after the deployment is completed.`,
      LogLevel.DEBUG
    );
    this.logsMonitor?.deactivate();
  };

  /**
   * Adds functionArn for each function name provided. All the ARN components are taken from the root stack Arn
   * @param sandboxBackendId backendId for retrieving the root stack
   * @param functionNames Name of the functions for which ARN needs to be generated
   * @returns An object containing function name and ARN for each function name provided
   */
  private getFunctionArnFromNames = async (
    sandboxBackendId: BackendIdentifier,
    functionNames?: string[]
  ) => {
    if (!functionNames || functionNames.length === 0) {
      return;
    }

    const rootStackResources = await this.cfnClient.send(
      new DescribeStacksCommand({
        StackName: BackendIdentifierConversions.toStackName(sandboxBackendId),
      })
    );

    if (!rootStackResources?.Stacks?.[0]?.StackId) {
      this.printer.log(
        `[Sandbox] Cannot load root stack for Id ${BackendIdentifierConversions.toStackName(
          sandboxBackendId
        )}. Streaming function logs will be turned off.`,
        LogLevel.DEBUG
      );
      return;
    }

    const stackArnComponents = Arn.split(
      rootStackResources.Stacks[0].StackId,
      ArnFormat.SLASH_RESOURCE_NAME
    );

    return functionNames.map((name) => {
      return {
        name,
        arn: Arn.format({
          resource: 'function',
          service: 'lambda',
          account: stackArnComponents.account,
          arnFormat: ArnFormat.COLON_RESOURCE_NAME,
          partition: stackArnComponents.partition,
          region: stackArnComponents.region,
          resourceName: name,
        }),
      };
    });
  };
}
