import { SSM, SSMServiceException } from '@aws-sdk/client-ssm';
import { SecretError } from './secret_error.js';
import {
  Secret,
  SecretAction,
  SecretClient,
  SecretIdentifier,
} from './secret.js';
import * as iam from 'aws-cdk-lib/aws-iam';
import { BackendId, UniqueBackendIdentifier } from '@aws-amplify/plugin-types';

const SHARED_SECRET = 'shared';

/**
 * This class implements Amplify Secret using SSM parameter store.
 */
export class SSMSecretClient implements SecretClient {
  /**
   * Creates a new instance of SSMSecret.
   */
  constructor(private readonly ssmClient: SSM) {}

  /**
   * Get a branch-specific parameter prefix.
   */
  private getBranchParameterPrefix = (
    backendIdentifier: UniqueBackendIdentifier
  ): string => {
    return `/amplify/${backendIdentifier.backendId}/${backendIdentifier.branchName}`;
  };

  /**
   * Get a branch-specific parameter full path.
   */
  private getBranchParameterFullPath = (
    backendIdentifier: UniqueBackendIdentifier,
    secretName: string
  ): string => {
    return `${this.getBranchParameterPrefix(backendIdentifier)}/${secretName}`;
  };

  /**
   * Get a shared parameter prefix.
   */
  private getSharedParameterPrefix = (backendId: BackendId): string => {
    return `/amplify/${SHARED_SECRET}/${backendId}`;
  };

  /**
   * Get a shared parameter full path.
   */
  private getSharedParameterFullPath = (
    backendId: BackendId,
    secretName: string
  ): string => {
    return `${this.getSharedParameterPrefix(backendId)}/${secretName}`;
  };

  /**
   * Get a parameter full path.
   */
  private getParameterFullPath = (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretName: string
  ): string => {
    if (typeof backendIdentifier === 'object') {
      return this.getBranchParameterFullPath(backendIdentifier, secretName);
    }
    return this.getSharedParameterFullPath(backendIdentifier, secretName);
  };

  /**
   * Get a parameter prefix.
   */
  private getParameterPrefix = (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ): string => {
    if (typeof backendIdentifier === 'object') {
      return this.getBranchParameterPrefix(backendIdentifier);
    }
    return this.getSharedParameterPrefix(backendIdentifier);
  };

  /**
   * Get a secret from SSM parameter store.
   */
  public getSecret = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId,
    secretIdentifier: SecretIdentifier
  ): Promise<Secret | undefined> => {
    const name = this.getParameterFullPath(
      backendIdentifier,
      secretIdentifier.name
    );
    try {
      const resp = await this.ssmClient.getParameter({
        Name: secretIdentifier.version
          ? `${name}:${secretIdentifier.version}`
          : name,
        WithDecryption: true,
      });
      if (resp.Parameter?.Name && resp.Parameter?.Value) {
        return {
          secretIdentifier: {
            name: secretIdentifier.name,
            version: resp.Parameter?.Version,
          },
          value: resp.Parameter?.Value,
        };
      }
      return;
    } catch (err) {
      throw SecretError.fromSSMException(err as SSMServiceException);
    }
  };

  /**
   * List secrets from SSM parameter store.
   */
  public listSecrets = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ): Promise<SecretIdentifier[]> => {
    const path = this.getParameterPrefix(backendIdentifier);
    const result: SecretIdentifier[] = [];

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
          result.push({
            name: secretName,
            version: param.Version,
          });
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
  ): Promise<SecretIdentifier> => {
    const name = this.getParameterFullPath(backendIdentifier, secretName);
    try {
      const resp = await this.ssmClient.putParameter({
        Name: name,
        Type: 'SecureString',
        Value: secretValue,
        Description: `Amplify Secret`,
        Overwrite: true,
      });
      return {
        name: secretName,
        version: resp.Version,
      };
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
  public grantPermission = (
    resource: iam.IGrantable,
    backendIdentifier: UniqueBackendIdentifier,
    secretActions: SecretAction[]
  ) => {
    const actionMap: { [K in SecretAction]: string } = {
      ['GET']: 'ssm:GetParameter',
      ['SET']: 'ssm:PutParameter',
      ['LIST']: 'ssm:GetParametersByPath',
      ['REMOVE']: 'ssm:DeleteParameter',
    };

    const secretPaths = [
      this.getParameterPrefix(backendIdentifier),
      this.getParameterPrefix(backendIdentifier.backendId),
    ];

    resource.grantPrincipal.addToPrincipalPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: secretActions.map((action) => actionMap[action]),
        resources: secretPaths.map(
          (path) => `arn:aws:ssm:*:*:parameter${path}/*`
        ),
      })
    );
  };
}
