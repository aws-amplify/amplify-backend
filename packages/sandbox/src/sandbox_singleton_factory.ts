import { FileWatchingSandbox } from './file_watching_sandbox.js';
import { BackendIdSandboxResolver, Sandbox } from './sandbox.js';
import { BackendDeployerFactory } from '@aws-amplify/backend-deployer';
import { AmplifySandboxExecutor } from './sandbox_executor.js';
import { CloudFormationClient } from '@aws-sdk/client-cloudformation';
import { getSecretClient } from '@aws-amplify/backend-secret';
import { Printer } from '@aws-amplify/cli-core';

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
    private readonly printer: Printer
  ) {}

  /**
   * Returns a singleton instance of a Sandbox
   */
  getInstance = async (): Promise<Sandbox> => {
    if (!this.instance) {
      this.instance = new FileWatchingSandbox(
        this.sandboxIdResolver,
        new AmplifySandboxExecutor(
          BackendDeployerFactory.getInstance(),
          getSecretClient(),
          this.printer
        ),
        new CloudFormationClient(),
        this.printer
      );
    }
    return this.instance;
  };
}
