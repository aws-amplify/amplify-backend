import { describe, it } from 'node:test';
import { getSecretClient } from './secret.js';
import assert from 'node:assert';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { SSMServiceException } from '@aws-sdk/client-ssm';
import { SecretError } from './secret_error.js';
import { SSMSecretClientWithAmplifyErrorHandling } from './ssm_secret_with_amplify_error_handling.js';

void describe('getSecretClientWithAmplifyErrorHandling', () => {
  const rawSecretClient = getSecretClient();
  const classUnderTest = new SSMSecretClientWithAmplifyErrorHandling(
    rawSecretClient
  );
  void it('throws AmplifyUserError if listSecrets fails due to ExpiredTokenException', async (context) => {
    const ssmError = new SSMServiceException({
      name: 'ExpiredTokenException',
      $fault: 'client',
      message: 'tokens expired',
      $metadata: {},
    });
    const secretsError = SecretError.createInstance(ssmError);
    context.mock.method(rawSecretClient, 'listSecrets', () => {
      throw secretsError;
    });

    await assert.rejects(
      () =>
        classUnderTest.listSecrets({
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        }),
      new AmplifyUserError('SSMCredentialsError', {
        message:
          'Failed to list secrets. ExpiredTokenException: tokens expired',
        resolution:
          'Make sure your AWS credentials are set up correctly, refreshed and have necessary permissions to call SSM service',
      })
    );
  });

  void it('throws AmplifyUserError if listSecrets fails due to CredentialsProviderError', async (context) => {
    const credentialsError = new Error('credentials error');
    credentialsError.name = 'CredentialsProviderError';
    const secretsError = SecretError.createInstance(credentialsError);
    context.mock.method(rawSecretClient, 'listSecrets', () => {
      throw secretsError;
    });
    await assert.rejects(
      () =>
        classUnderTest.listSecrets({
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        }),
      new AmplifyUserError('SSMCredentialsError', {
        message:
          'Failed to list secrets. CredentialsProviderError: credentials error',
        resolution:
          'Make sure your AWS credentials are set up correctly, refreshed and have necessary permissions to call SSM service',
      })
    );
  });

  void it('throws AmplifyUserError if getSecret fails due to ParameterNotFound error', async (context) => {
    const notFoundError = new Error('Parameter not found error');
    notFoundError.name = 'ParameterNotFound';
    const secretsError = SecretError.createInstance(notFoundError);
    context.mock.method(rawSecretClient, 'getSecret', () => {
      throw secretsError;
    });
    const secretName = 'testSecretName';
    await assert.rejects(
      () =>
        classUnderTest.getSecret(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          {
            name: secretName,
          }
        ),
      new AmplifyUserError('SSMParameterNotFoundError', {
        message: `Failed to get ${secretName} secret. ParameterNotFound: Parameter not found error`,
        resolution: `Make sure that ${secretName} has been set. See https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/.`,
      })
    );
  });

  void it('throws AmplifyUserError if removeSecret fails due to ParameterNotFound error', async (context) => {
    const notFoundError = new Error('Parameter not found error');
    notFoundError.name = 'ParameterNotFound';
    const secretsError = SecretError.createInstance(notFoundError);
    context.mock.method(rawSecretClient, 'removeSecret', () => {
      throw secretsError;
    });
    const secretName = 'testSecretName';
    await assert.rejects(
      () =>
        classUnderTest.removeSecret(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          secretName
        ),
      new AmplifyUserError('SSMParameterNotFoundError', {
        message: `Failed to remove ${secretName} secret. ParameterNotFound: Parameter not found error`,
        resolution: `Make sure that ${secretName} has been set. See https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/.`,
      })
    );
  });

  void it('throws AmplifyFault if listSecrets fails due to a non-SSM exception other than expired credentials', async (context) => {
    const underlyingError = new Error('some secret error');
    const secretsError = SecretError.createInstance(underlyingError);
    context.mock.method(rawSecretClient, 'listSecrets', () => {
      throw secretsError;
    });
    await assert.rejects(
      () =>
        classUnderTest.listSecrets({
          namespace: 'testSandboxId',
          name: 'testSandboxName',
          type: 'sandbox',
        }),
      new AmplifyFault(
        'ListSecretsFailedFault',
        {
          message: 'Failed to list secrets. Error: some secret error',
        },
        underlyingError // If it's not an SSM exception, we use the original error instead of secrets error
      )
    );
  });

  void it('throws AmplifyFault if getSecret fails due to an SSM exception other than expired credentials', async (context) => {
    const underlyingError = new SSMServiceException({
      name: 'SomeException',
      message: 'some error',
      $fault: 'client',
      $metadata: {},
    });
    const secretsError = SecretError.createInstance(underlyingError);
    context.mock.method(rawSecretClient, 'getSecret', () => {
      throw secretsError;
    });
    await assert.rejects(
      () =>
        classUnderTest.getSecret(
          {
            namespace: 'testSandboxId',
            name: 'testSandboxName',
            type: 'sandbox',
          },
          { name: 'testSecret' }
        ),
      new AmplifyFault(
        'GetSecretsFailedFault',
        {
          message: 'Failed to get secrets. SomeException: some error',
        },
        secretsError // If it's an SSM exception, we use the wrapper secret error
      )
    );
  });
});
