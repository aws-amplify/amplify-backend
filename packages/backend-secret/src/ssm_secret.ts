import { SSM } from '@aws-sdk/client-ssm';
import { SecretError } from './secret_error.js';
import {
  Secret,
  SecretClient,
  SecretIdentifier,
  SecretListItem,
} from './secret.js';
import { AppId, BackendIdentifier } from '@aws-amplify/plugin-types';
import { ParameterPathConversions } from '@aws-amplify/platform-core';

/**
 * This class implements Amplify Secret using SSM parameter store.
 */
export class SSMSecretClient implements SecretClient {
  /**
   * Creates a new instance of SSMSecret.
   */
  constructor(private readonly ssmClient: SSM) {}

  /**
   * Get a secret from SSM parameter store.
   */
  public getSecret = async (
    backendIdentifier: BackendIdentifier | AppId,
    secretIdentifier: SecretIdentifier
  ): Promise<Secret> => {
    let secret: Secret | undefined;
    const parameterPathConversions = new ParameterPathConversions();
    const name: string = parameterPathConversions.toParameterFullPath(
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
    backendIdentifier: BackendIdentifier | AppId
  ): Promise<SecretListItem[]> => {
    const parameterPathConversions = new ParameterPathConversions();
    const path = parameterPathConversions.toParameterPrefix(backendIdentifier);
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
    backendIdentifier: BackendIdentifier | AppId,
    secretName: string,
    secretValue: string
  ): Promise<SecretIdentifier> => {
    const parameterPathConversions = new ParameterPathConversions();
    const name = parameterPathConversions.toParameterFullPath(
      backendIdentifier,
      secretName
    );
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
    backendIdentifier: BackendIdentifier | AppId,
    secretName: string
  ) => {
    const parameterPathConversions = new ParameterPathConversions();
    const name = parameterPathConversions.toParameterFullPath(
      backendIdentifier,
      secretName
    );
    try {
      await this.ssmClient.deleteParameter({
        Name: name,
      });
    } catch (err) {
      throw SecretError.createInstance(err as Error);
    }
  };
}
