import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { BackendOutputClient } from '@aws-amplify/deployed-backend-client';
import { TagName } from '@aws-amplify/platform-core';
import { BackendIdentifier, BackendOutput } from '@aws-amplify/plugin-types';

import { GetFunctionCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';
import { SandboxFunctionStreamingOptions } from './sandbox.js';

/**
 * Logs streamer for customer defined lambda functions in a sandbox.
 */
export class LambdaFunctionLogStreamer {
  private enabled: boolean = false;
  /**
   * Creates an instance of LambdaFunctionLogStreamer
   */
  constructor(
    private readonly lambda: LambdaClient,
    private readonly logsMonitor: CloudWatchLogEventMonitor,
    private readonly backendOutputClient: BackendOutputClient,
    private readonly printer: Printer
  ) {}

  /**
   * Starts streaming logs in the given sandbox.
   * @param sandboxBackendId The sandbox backend identifier.
   * @param streamingOptions Options to configure the log streaming.
   */
  startStreamingLogs = async (
    sandboxBackendId: BackendIdentifier,
    streamingOptions?: SandboxFunctionStreamingOptions
  ) => {
    if (streamingOptions?.enabled) {
      this.enabled = true;
    } else {
      return;
    }

    const backendOutput: BackendOutput =
      await this.backendOutputClient.getOutput(sandboxBackendId);

    const definedFunctionsPayload =
      backendOutput['AWS::Amplify::Function']?.payload.definedFunctions;
    const definedConversationHandlersPayload =
      backendOutput['AWS::Amplify::AI::Conversation']?.payload
        .definedConversationHandlers;
    const deployedFunctionNames = definedFunctionsPayload
      ? (JSON.parse(definedFunctionsPayload) as string[])
      : [];
    deployedFunctionNames.push(
      ...(definedConversationHandlersPayload
        ? (JSON.parse(definedConversationHandlersPayload) as string[])
        : [])
    );

    for (const functionName of deployedFunctionNames) {
      const getFunctionResponse = await this.lambda.send(
        new GetFunctionCommand({
          FunctionName: functionName,
        })
      );
      const logGroupName =
        getFunctionResponse.Configuration?.LoggingConfig?.LogGroup;
      if (!logGroupName) {
        this.printer.log(
          `[Sandbox] Could not find logGroup for lambda function ${functionName}. Logs will not be streamed for this function.`,
          LogLevel.DEBUG
        );
        continue;
      }
      const friendlyFunctionName =
        getFunctionResponse.Tags?.[TagName.FRIENDLY_NAME];
      if (!friendlyFunctionName) {
        this.printer.log(
          `[Sandbox] Could not find user defined name for lambda function ${functionName}. Logs will not be streamed for this function.`,
          LogLevel.DEBUG
        );
        continue;
      }

      let shouldStreamLogs = false;
      if (streamingOptions.logsFilters) {
        for (const filter of streamingOptions.logsFilters) {
          const pattern = new RegExp(filter);
          if (pattern.test(friendlyFunctionName)) {
            shouldStreamLogs = true;
            this.printer.log(
              `[Sandbox] Logs for function ${friendlyFunctionName} will be streamed as it matched filter '${filter}'`,
              LogLevel.DEBUG
            );
            break;
          }
        }
      } else {
        // No logs filter, means we stream all logs
        this.printer.log(
          `[Sandbox] Logs for function ${friendlyFunctionName} will be streamed.`,
          LogLevel.DEBUG
        );
        shouldStreamLogs = true;
      }

      if (shouldStreamLogs) {
        this.logsMonitor?.addLogGroups(friendlyFunctionName, logGroupName);
      } else {
        this.printer.log(
          `[Sandbox] Skipping logs streaming for function ${friendlyFunctionName} since it did not match any filters. To stream logs for this function, ensure at least one of your logs-filters match this function name.`,
          LogLevel.DEBUG
        );
      }
    }

    // finally start listening
    this.logsMonitor?.activate(streamingOptions.logsOutFile);
  };

  stopStreamingLogs = () => {
    if (!this.enabled) {
      return;
    }
    this.printer.log(
      `[Sandbox] Streaming function logs will be paused during the deployment and will be resumed after the deployment is completed.`,
      LogLevel.DEBUG
    );
    this.logsMonitor?.pause();
  };
}
