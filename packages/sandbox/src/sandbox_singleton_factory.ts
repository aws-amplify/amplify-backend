import {
  Format,
  PackageManagerControllerFactory,
  Printer,
} from '@aws-amplify/cli-core';
import { FileWatchingSandbox } from './file_watching_sandbox.js';
import { BackendIdSandboxResolver, Sandbox } from './sandbox.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { SSMClient } from '@aws-sdk/client-ssm';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { CloudWatchLogsClient } from '@aws-sdk/client-cloudwatch-logs';
import { LambdaClient } from '@aws-sdk/client-lambda';
import { BackendOutputClientFactory } from '@aws-amplify/deployed-backend-client';
import { LambdaFunctionLogStreamer } from './lambda_function_log_streamer.js';
import { CloudWatchLogEventMonitor } from './cloudwatch_logs_monitor.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';

/**
 * Factory to create a new sandbox
 */
export class SandboxSingletonFactory {
  private instance: Sandbox | undefined;
  /**
   * sandboxIdResolver allows sandbox to lazily load the sandbox backend id on demand
   */
  constructor(
    private readonly sandboxIdResolver: BackendIdSandboxResolver,
    private readonly printer: Printer,
    private readonly format: Format
  ) {}

  /**
   * Returns a singleton instance of a Sandbox
   */
  getInstance = async (): Promise<Sandbox> => {
    if (!this.instance) {
      const packageManagerControllerFactory =
        new PackageManagerControllerFactory(process.cwd(), this.printer);
      const backendDeployerFactory = new BackendDeployerFactory(
        packageManagerControllerFactory.getPackageManagerController(),
        this.format
      );
      const cfnClient = new CloudFormationClient();
      this.instance = new FileWatchingSandbox(
        this.sandboxIdResolver,
        new AmplifySandboxExecutor(
          backendDeployerFactory.getInstance(),
          getSecretClient(),
          this.printer
        ),
        new SSMClient(),
        new LambdaFunctionLogStreamer(
          new LambdaClient(),
          cfnClient,
          new CloudWatchLogEventMonitor(new CloudWatchLogsClient()),
          BackendOutputClientFactory.getInstance(),
          this.printer
        ),
        this.printer
      );
    }
    return this.instance;
  };
}
