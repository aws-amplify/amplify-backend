import { SSM, SSMServiceException } from '@aws-sdk/client-ssm';
import { SecretError } from './secret_error.js';
import { Secret, SecretActionType } from './secret.js';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const SHARED_SECRET = 'shared';

/**
 * This class implements Amplify Secret using SSM parameter store.
 */
export class SSMSecret implements Secret {
  /**
   * Creates a new instance of SSMSecret.
   */
  constructor(private readonly ssmClient: SSM) {}

  /**
   * Construct a full parameter name path.
   */
  private getParameterFullPath = (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName?: string
  ): string => {
    if (typeof backendIdentifier === 'object') {
      // specific-branch secret
      if (secretName) {
        return `/amplify/${backendIdentifier.backendId}/${backendIdentifier.branchName}/${secretName}`;
      }
      return `/amplify/${backendIdentifier.backendId}/${backendIdentifier.branchName}`;
    }
    // shared backend secret
    if (secretName) {
      return `/amplify/${SHARED_SECRET}/${backendIdentifier}/${secretName}`;
    }
    return `/amplify/${SHARED_SECRET}/${backendIdentifier}`;
  };

  /**
   * Get a secret from SSM parameter store.
   */
  public getSecret = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ): Promise<string | undefined> => {
    const name = this.getParameterFullPath(backendIdentifier, secretName);
    try {
      const resp = await this.ssmClient.getParameter({
        Name: name,
        WithDecryption: true,
      });
      return resp.Parameter?.Value;
    } catch (err) {
      throw SecretError.fromSSMException(err as SSMServiceException);
    }
  };

  /**
   * List secrets from SSM parameter store.
   */
  public listSecrets = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ): Promise<string[] | undefined> => {
    const path = this.getParameterFullPath(backendIdentifier);
    const result: string[] = [];

    try {
      const resp = await this.ssmClient.getParametersByPath({
        Path: path,
        WithDecryption: true,
      });

      resp.Parameters?.forEach((param) => {
        if (!param.Name || !param.Value) {
          return;
        }
        const secretName = param.Name.split('/').pop();
        if (secretName) {
          result.push(secretName);
        }
      });
      return result;
    } catch (err) {
      throw SecretError.fromSSMException(err as SSMServiceException);
    }
  };

  /**
   * Set a secret in SSM parameter store.
   */
  public setSecret = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string,
    secretValue: string
  ) => {
    const name = this.getParameterFullPath(backendIdentifier, secretName);
    try {
      await this.ssmClient.putParameter({
        Name: name,
        Type: 'SecureString',
        Value: secretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
    } catch (err) {
      throw SecretError.fromSSMException(err as SSMServiceException);
    }
  };

  /**
   * Remove a secret from SSM parameter store.
   */
  public removeSecret = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ) => {
    const name = this.getParameterFullPath(backendIdentifier, secretName);
    try {
      await this.ssmClient.deleteParameter({
        Name: name,
      });
    } catch (err) {
      throw SecretError.fromSSMException(err as SSMServiceException);
    }
  };

  /**
   * Get required IAM policy statement to perform the input actions.
   */
  public getIAMPolicyStatement = (
    backendIdentifier: UniqueBackendIdentifier,
    secretActions: SecretActionType[]
  ): iam.PolicyStatement => {
    const actionMap = {
      [SecretActionType.GET]: 'ssm:GetParameter',
      [SecretActionType.SET]: 'ssm:PutParameter',
      [SecretActionType.LIST]: 'ssm:GetParametersByPath',
      [SecretActionType.REMOVE]: 'ssm:DeleteParameter',
    };

    const secretPaths = [
      this.getParameterFullPath(backendIdentifier),
      this.getParameterFullPath(backendIdentifier.backendId),
    ];

    return new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: secretActions.map((action) => actionMap[action]),
      resources: secretPaths.map(
        (path) => `arn:aws:ssm:*:*:parameter${path}/*`
      ),
    });
  };
}
