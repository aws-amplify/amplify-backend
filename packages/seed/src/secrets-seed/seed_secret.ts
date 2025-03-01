import {
  SecretClient,
  getSecretClientWithAmplifyErrorHandling,
} from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 *
 */
export class SeedSecretClient {
  /**
   * constructor
   */
  constructor(
    private readonly getSecretClient: SecretClient = getSecretClientWithAmplifyErrorHandling()
  ) {}

  getSecret = async (secretName: string): Promise<string> => {
    if (!process.env.AMPLIFY_BACKEND_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution:
          'Run npx ampx sandbox before re-running npx ampx sandbox seed',
      });
    }

    const backendId: BackendIdentifier = JSON.parse(
      process.env.AMPLIFY_BACKEND_IDENTIFIER
    );

    const secretClient = this.getSecretClient;
    const secret = await secretClient.getSecret(backendId, {
      name: secretName,
    });
    return secret.value;
  };

  setSecret = async (
    secretName: string,
    secretValue: string
  ): Promise<string> => {
    if (!process.env.AMPLIFY_BACKEND_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution:
          'Run npx ampx sandbox before re-running npx ampx sandbox seed',
      });
    }

    const backendId: BackendIdentifier = JSON.parse(
      process.env.AMPLIFY_BACKEND_IDENTIFIER
    );

    const secretClient = this.getSecretClient;
    const secret = await secretClient.setSecret(
      backendId,
      secretName,
      secretValue
    );
    return secret.name;
  };
}

/**
 * Allows for programmatic getting of secrets in Parameter store
 * @param secretName - identifier for secret
 * @returns - specified secret from AWS Systems Manager Parameter Store
 */
export const getSecret = async (secretName: string): Promise<string> => {
  return await new SeedSecretClient().getSecret(secretName);
};

/**
 * Allows for programmatic setting of secrets in Parameter store
 * @param secretName - identifier for secret
 * @param secretValue - value secret is set to
 * @returns - name of the secret that has been added to AWS Systems Manager Parameter Store
 */
export const setSecret = async (
  secretName: string,
  secretValue: string
): Promise<string> => {
  return await new SeedSecretClient().setSecret(secretName, secretValue);
};
