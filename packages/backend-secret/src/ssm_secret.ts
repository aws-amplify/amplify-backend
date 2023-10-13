import { SSM } from '@aws-sdk/client-ssm';
import { SecretError } from './secret_error.js';
import {
  Secret,
  SecretClient,
  SecretIdentifier,
  SecretListItem,
} from './secret.js';
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
    return `/amplify/${backendIdentifier.backendId}/${backendIdentifier.disambiguator}`;
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
  ): Promise<Secret> => {
    let secret: Secret | undefined;
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
      if (resp.Parameter?.Value) {
        secret = {
          name: secretIdentifier.name,
          version: resp.Parameter.Version,
          value: resp.Parameter.Value,
          lastUpdated: resp.Parameter.LastModifiedDate,
        };
      }
    } catch (err) {
      throw SecretError.createInstance(err as Error);
    }

    if (!secret) {
      throw new SecretError(
        `The value of secret '${secretIdentifier.name}' is undefined`
      );
    }

    return secret;
  };

  /**
   * List secrets from SSM parameter store.
   */
  public listSecrets = async (
    backendIdentifier: UniqueBackendIdentifier | BackendId
  ): Promise<SecretListItem[]> => {
    const path = this.getParameterPrefix(backendIdentifier);
    const result: SecretListItem[] = [];

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
            lastUpdated: param.LastModifiedDate,
          });
        }
      });
      return result;
    } catch (err) {
      throw SecretError.createInstance(err as Error);
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
      throw SecretError.createInstance(err as Error);
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
      throw SecretError.createInstance(err as Error);
    }
  };
}
