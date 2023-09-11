import { SSMSecret } from './ssm_secret.js';
import { AwsCredentialIdentityProvider } from '@aws-sdk/types';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { SSM } from '@aws-sdk/client-ssm';

export type Secret = {
  /**
   * Get a secret value.
   */
  getSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ) => Promise<string | undefined>;

  /**
   * List secrets.
   */
  listSecrets: (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ) => Promise<string[] | undefined>;

  /**
   * Set a secret.
   */
  setSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string,
    secretValue: string
  ) => Promise<void>;

  /**
   * Remove a secret.
   */
  removeSecret: (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ) => Promise<void>;

  /**
   * Get an IAM policy statement to invoke secret operations.
   */
  getIAMPolicyStatement: (
    backendIdentifier: UniqueBackendIdentifier,
    secretActions: SecretActionType[]
  ) => iam.PolicyStatement;
};

/**
 * Secret action type.
 */
export enum SecretActionType {
  GET,
  SET,
  REMOVE,
  LIST,
}

/**
 * Creates an Amplify secret client.
 */
export const SecretClient = (
  credentialProvider?: AwsCredentialIdentityProvider
): Secret => {
  return new SSMSecret(
    new SSM({
      credentials: credentialProvider,
    })
  );
};
