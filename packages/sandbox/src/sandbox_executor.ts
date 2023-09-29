import debounce from 'debounce-promise';
import { BackendDeployer, DeployProps } from '@aws-amplify/backend-deployer';
import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SecretClient } from '@aws-amplify/backend-secret';

/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly secretClient: SecretClient
  ) {}

  private getSecretContext = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<string[]> => {
    const secretContext: string[] = [];
    const secrets = await this.secretClient.listSecrets(
      uniqueBackendIdentifier
    );
    secrets.forEach((secret) => {
      if (secret.lastUpdated) {
        secretContext.push(
          '--context',
          `${secret.name}=${secret.lastUpdated.getTime()}`
        );
      }
    });

    return secretContext;
  };

  /**
   * Deploys sandbox
   */
  deploy = async (
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    const deployProps: DeployProps = {
      hotswapFallback: true,
      method: 'direct',
    };
    const secretContext = await this.getSecretContext(uniqueBackendIdentifier);
    if (secretContext.length != 0) {
      deployProps.additionalArguments = secretContext;
    }

    return this.invoke(() =>
      this.backendDeployer.deploy(uniqueBackendIdentifier, deployProps)
    );
  };

  /**
   * Destroy sandbox
   */
  destroy = (
    uniqueBackendIdentifier?: UniqueBackendIdentifier
  ): Promise<void> => {
    console.debug('[Sandbox] Executing command `deploy`');
    return this.invoke(() =>
      this.backendDeployer.destroy(uniqueBackendIdentifier)
    );
  };

  /**
   * Function that deploys/destroys backend resources
   * Debounce is added in case multiple duplicate events are received.
   */
  private invoke = debounce(
    async (callback: () => Promise<void>): Promise<void> => {
      try {
        await callback();
      } catch (error) {
        let message;
        if (error instanceof Error) message = error.message;
        else message = String(error);
        console.log(message);
        // do not propagate and let the sandbox continue to run
      }
    },
    100
  );
}
