import { getSecretClientWithAmplifyErrorHandling } from '@aws-amplify/backend-secret';
import { BackendIdentifier } from '@aws-amplify/plugin-types';
import { AmplifyUserError } from '@aws-amplify/platform-core';

/**
 *
 */
export class SecretClient {
  getSecret = async (secretName: string): Promise<string> => {
    if (!process.env.AMPLIFY_SANDBOX_IDENTIFIER) {
      throw new AmplifyUserError('SandboxIdentifierNotFoundError', {
        message: 'Sandbox Identifier is undefined',
        resolution:
          'Run npx ampx sandbox before re-running npx ampx sandbox seed',
      });
    }

    const backendId: BackendIdentifier = JSON.parse(
      process.env.AMPLIFY_SANDBOX_IDENTIFIER
    );

    const secretClient = getSecretClientWithAmplifyErrorHandling();
    const secret = await secretClient.getSecret(backendId, {
      name: secretName,
    });
    return secret.value;
  };
}

/**
 * Allows for programmatic access to secrets in Parameter store
 * @param secretName identifier for secret
 * @returns specified secret from AWS Systems Manager Parameter Store
 */
export const getSecret = async (secretName: string): Promise<string> => {
  return await new SecretClient().getSecret(secretName);
};
