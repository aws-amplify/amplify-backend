import { SSMSecretClient } from './ssm_secret.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import { SSM } from '@aws-sdk/client-ssm';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

/**
 * The unique identifier of the secret.
 */
export type SecretIdentifier = {
  name: string;
  version?: number;
};

/**
 * The secret object.
 */
export type Secret = SecretIdentifier & {
  value: string;
  lastUpdated?: Date;
};

/**
 * The returned object type of listSecrets API.
 */
export type SecretListItem = SecretIdentifier & {
  lastUpdated?: Date;
};

/**
 * The client to manage backend secret.
 */
export type SecretClient = {
  /**
   * Get a secret value.
   */
  getSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretIdentifier: SecretIdentifier
  ) => Promise<Secret>;

  /**
   * List secrets.
   */
  listSecrets: (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ) => Promise<SecretListItem[]>;

  /**
   * Set a secret.
   */
  setSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string,
    secretValue: string
  ) => Promise<SecretIdentifier>;

  /**
   * Remove a secret.
   */
  removeSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ) => Promise<void>;
};

/**
 * Secret client configuration.
 */
export type SecretClientConfig = {
  credentials?: AwsCredentialIdentityProvider;
  region?: string;
};

/**
 * Creates an Amplify secret client.
 */
export const getSecretClient = (
  secretClientConfig?: SecretClientConfig
): SecretClient => {
  return new SSMSecretClient(
    new SSM({
      credentials: secretClientConfig?.credentials,
      region: secretClientConfig?.region,
    })
  );
};
