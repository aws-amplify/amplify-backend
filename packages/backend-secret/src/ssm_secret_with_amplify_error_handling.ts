import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';
import {
  Secret,
  SecretClient,
  SecretIdentifier,
  SecretListItem,
} from './secret.js';
import { SecretError } from './secret_error.js';
import { AmplifyFault, AmplifyUserError } from '@aws-amplify/platform-core';
import { SSMServiceException } from '@aws-sdk/client-ssm';

/**
 * Handles errors and translate them to AmplifyUserError or AmplifyFaults
 * To be used exclusively by the amplify cli
 */
export class SSMSecretClientWithAmplifyErrorHandling implements SecretClient {
  /**
   * wraps the secretClient with Amplify CLI specific error handling
   */
  constructor(private readonly secretClient: SecretClient) {}

  getSecret = async (
    backendIdentifier: BackendIdentifier | AppId,
    secretIdentifier: SecretIdentifier
  ): Promise<Secret> => {
    try {
      return await this.secretClient.getSecret(
        backendIdentifier,
        secretIdentifier
      );
    } catch (e) {
      throw this.translateToAmplifyError(e, 'Get', secretIdentifier);
    }
  };

  listSecrets = async (
    backendIdentifier: BackendIdentifier | AppId
  ): Promise<SecretListItem[]> => {
    try {
      return await this.secretClient.listSecrets(backendIdentifier);
    } catch (e) {
      throw this.translateToAmplifyError(e, 'List');
    }
  };

  setSecret = async (
    backendIdentifier: BackendIdentifier | AppId,
    secretName: string,
    secretValue: string
  ): Promise<SecretIdentifier> => {
    try {
      return await this.secretClient.setSecret(
        backendIdentifier,
        secretName,
        secretValue
      );
    } catch (e) {
      throw this.translateToAmplifyError(e, 'Set');
    }
  };

  removeSecret = async (
    backendIdentifier: BackendIdentifier | AppId,
    secretName: string
  ): Promise<void> => {
    try {
      return await this.secretClient.removeSecret(
        backendIdentifier,
        secretName
      );
    } catch (e) {
      throw this.translateToAmplifyError(e, 'Remove', { name: secretName });
    }
  };

  private translateToAmplifyError = (
    error: unknown,
    apiName: string,
    secretIdentifier?: SecretIdentifier
  ) => {
    if (error instanceof SecretError && error.cause) {
      if (
        [
          'UnrecognizedClientException',
          'AccessDeniedException',
          'NotAuthorized',
          'ExpiredTokenException',
          'ExpiredToken',
          'CredentialsProviderError',
          'IncompleteSignatureException',
          'InvalidSignatureException',
        ].includes(error.cause.name)
      ) {
        return new AmplifyUserError('SSMCredentialsError', {
          message: `Failed to ${apiName.toLowerCase()} secrets. ${
            error.cause.name
          }: ${error.cause?.message}`,
          resolution:
            'Make sure your AWS credentials are set up correctly, refreshed and have necessary permissions to call SSM service',
        });
      }
      if (
        error.cause.name === 'ParameterNotFound' &&
        (apiName === 'Get' || apiName === 'Remove') &&
        secretIdentifier
      ) {
        return new AmplifyUserError('SSMParameterNotFoundError', {
          message: `Failed to ${apiName.toLowerCase()} ${
            secretIdentifier.name
          } secret. ${error.cause.name}: ${error.cause?.message}`,
          resolution: `Make sure that ${secretIdentifier.name} has been set. See https://docs.amplify.aws/react/deploy-and-host/fullstack-branching/secrets-and-vars/.`,
        });
      }
      let downstreamException: Error = error;
      if (
        !(error.cause instanceof SSMServiceException) &&
        error.cause instanceof Error
      ) {
        downstreamException = error.cause;
      }
      throw new AmplifyFault(
        `${apiName}SecretsFailedFault`,
        {
          message: `Failed to ${apiName.toLowerCase()} secrets. ${
            error.cause.name
          }: ${error.cause?.message}`,
        },
        downstreamException
      );
    }
    return error;
  };
}
