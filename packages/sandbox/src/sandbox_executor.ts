import debounce from 'debounce-promise';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  BackendDeployer,
  DeployResult,
  DestroyResult,
} from '@aws-amplify/backend-deployer';
import {
  SecretClient,
  SecretError,
  SecretListItem,
} from '@aws-amplify/backend-secret';
import { LogLevel, Printer } from '@aws-amplify/cli-core';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { SSMServiceException } from '@aws-sdk/client-ssm';
import { SecretNamesGenerator } from './secret_names_generator.js';

/**
 * Execute CDK commands.
 */
export class AmplifySandboxExecutor {
  /**
   * Function that invokes the callback with debounce.
   * Debounce is needed in case multiple duplicate events are received.
   */
  private invoke = debounce(
    async (
      callback: () => Promise<DeployResult | DestroyResult>
    ): Promise<DeployResult | DestroyResult> => await callback(),
    100
  );

  /**
   * Creates an AmplifySandboxExecutor instance
   */
  constructor(
    private readonly backendDeployer: BackendDeployer,
    private readonly secretClient: SecretClient,
    private readonly printer: Printer
  ) {}

  /**
   * Deploys sandbox
   */
  deploy = async (
    backendId: BackendIdentifier,
    validateAppSourcesProvider: () => boolean
  ): Promise<DeployResult> => {
    this.printer.log('[Sandbox] Executing command `deploy`', LogLevel.DEBUG);
    const secrets = await this.getSecretsList(backendId);
    new SecretNamesGenerator().generateTypeForSecretNames(
      secrets.map((secret) => secret.name)
    );
    const secretLastUpdated = await this.getSecretLastUpdated(secrets);

    return this.invoke(() => {
      // it's important to get information here so that information
      // doesn't get lost while debouncing
      const validateAppSources = validateAppSourcesProvider();
      return this.backendDeployer.deploy(backendId, {
        secretLastUpdated,
        validateAppSources,
      });
    });
  };

  /**
   * Destroy sandbox. Do not swallow errors
   */
  destroy = (backendId: BackendIdentifier): Promise<DestroyResult> => {
    this.printer.log('[Sandbox] Executing command `destroy`', LogLevel.DEBUG);
    return this.invoke(() => this.backendDeployer.destroy(backendId));
  };

  private getSecretLastUpdated = async (
    secrets: SecretListItem[]
  ): Promise<Date | undefined> => {
    let latestTimestamp = -1;
    let secretLastUpdate: Date | undefined;

    secrets.forEach((secret) => {
      if (!secret.lastUpdated) {
        return;
      }
      const curTimeStamp = secret.lastUpdated.getTime();
      if (curTimeStamp > 0 && curTimeStamp > latestTimestamp) {
        latestTimestamp = curTimeStamp;
        secretLastUpdate = secret.lastUpdated;
      }
    });

    return secretLastUpdate;
  };

  private getSecretsList = async (backendId: BackendIdentifier) => {
    try {
      return this.secretClient.listSecrets(backendId);
    } catch (err) {
      if (
        err instanceof SecretError &&
        err.cause &&
        err.cause instanceof SSMServiceException
      ) {
        if (err.cause.name === 'ExpiredTokenException') {
          throw new AmplifyUserError(
            'SecretsExpiredTokenError',
            {
              message:
                'Fetching the list of secrets failed due to expired tokens',
              resolution: 'Please refresh your credentials and try again',
            },
            err
          );
        }
      }
      throw new AmplifyFault(
        'ListSecretsFailedFault',
        {
          message: 'Fetching the list of secrets failed',
        },
        err as Error
      );
    }
  };
}
