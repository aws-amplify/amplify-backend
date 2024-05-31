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
      this.instance = new FileWatchingSandbox(
        this.sandboxIdResolver,
        new AmplifySandboxExecutor(
          backendDeployerFactory.getInstance(),
          getSecretClient(),
          this.printer
        ),
        new SSMClient(),
        this.printer
      );
    }
    return this.instance;
  };
}
