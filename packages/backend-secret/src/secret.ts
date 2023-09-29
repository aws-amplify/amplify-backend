import { SSMSecretClient } from './ssm_secret.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import * as iam from 'aws-cdk-lib/aws-iam';
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
  ) => Promise<Secret[]>;

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

  /**
   * Grant permission to operate on secrets.
   */
  grantPermission: (
    resource: iam.IGrantable,
    backendIdentifier: UniqueBackendIdentifier,
    secretActions: SecretAction[]
  ) => void;
};

/**
 * Secret action type.
 */
export type SecretAction = 'GET' | 'SET' | 'REMOVE' | 'LIST';

/**
 * Creates an Amplify secret client.
 */
export const getSecretClient = (
  credentialProvider?: AwsCredentialIdentityProvider
): SecretClient => {
  return new SSMSecretClient(
    new SSM({
      credentials: credentialProvider,
    })
  );
};
