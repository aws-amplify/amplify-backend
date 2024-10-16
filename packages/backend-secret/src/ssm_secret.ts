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
    const name: string = ParameterPathConversions.toParameterFullPath(
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
    const path = ParameterPathConversions.toParameterPrefix(backendIdentifier);
    const result: SecretListItem[] = [];

    try {
      let nextToken: string | undefined;
      do {
        const resp = await this.ssmClient.getParametersByPath({
          Path: path,
          WithDecryption: true,
          NextToken: nextToken,
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
        nextToken = resp.NextToken;
      } while (nextToken);
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
    const name = ParameterPathConversions.toParameterFullPath(
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
    const name = ParameterPathConversions.toParameterFullPath(
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
