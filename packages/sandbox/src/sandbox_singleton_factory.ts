import {
  AmplifyIOEventsBridgeSingletonFactory,
  Format,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import { FileWatchingSandbox } from './file_watching_sandbox.js';
import { BackendIdSandboxResolver, Sandbox } from './sandbox.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { SSMClient } from '@aws-sdk/client-ssm';
import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { LambdaFunctionLogStreamer } from './lambda_function_log_streamer.js';
import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';
import { SDKProfileResolver } from '@aws-amplify/plugin-types';

/**
 * Factory to create a new sandbox
 */
export class SandboxSingletonFactory {
  private static instance: Sandbox | undefined;
  /**
   * sandboxIdResolver allows sandbox to lazily load the sandbox backend id on demand
   */
  constructor(
    private readonly sandboxIdResolver: BackendIdSandboxResolver,
    private readonly sdkProfileResolver: SDKProfileResolver,
    private readonly printer: Printer,
    private readonly format: Format,
  ) {}

  /**
   * Returns a singleton instance of a Sandbox
   * @param logger Optional logger to override the default printer
   */
  getInstance = async (logger?: Printer): Promise<Sandbox> => {
    if (!SandboxSingletonFactory.instance) {
      const printerToUse = logger || this.printer;
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(process.cwd(), printerToUse);
      const cdkEventsBridgeIoHost = new AmplifyIOEventsBridgeSingletonFactory(
        printerToUse,
      ).getInstance();

      const backendDeployerFactory = new BackendDeployerFactory(
        packageManagerControllerFactory.getPackageManagerController(),
        this.format,
        cdkEventsBridgeIoHost,
        this.sdkProfileResolver,
      );
      SandboxSingletonFactory.instance = new FileWatchingSandbox(
        this.sandboxIdResolver,
        new AmplifySandboxExecutor(
          backendDeployerFactory.getInstance(),
          getSecretClientWithAmplifyErrorHandling(),
          printerToUse,
        ),
        new SSMClient(),
        new LambdaFunctionLogStreamer(
          new LambdaClient(),
          new CloudWatchLogEventMonitor(new CloudWatchLogsClient()),
          BackendOutputClientFactory.getInstance(),
          printerToUse,
        ),
        printerToUse,
      );
    }
    return SandboxSingletonFactory.instance;
  };
}
