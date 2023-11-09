import { BackendIdentifier, BackendSecret } from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { BackendSecretFetcherFactory } from './backend_secret_fetcher_factory.js';
import { SecretValue } from 'aws-cdk-lib';

/**
 * Resolves a backend secret to a CFN token via a lambda-backed CFN custom resource.
 */
export class CfnTokenBackendSecret implements BackendSecret {
  /**
   * The name of the secret to fetch.
   */
  constructor(
    private readonly name: string,
    private readonly secretResourceFactory: BackendSecretFetcherFactory
  ) {}
  /**
   * Get a reference to the value within a CDK scope.
   */
  resolve = (
    scope: Construct,
    backendIdentifier: BackendIdentifier
  ): SecretValue => {
    const secretResource = this.secretResourceFactory.getOrCreate(
      scope,
      this.name,
      backendIdentifier
    );

    const val = secretResource.getAttString('secretValue');
    return SecretValue.unsafePlainText(val); // safe since 'val' is a cdk token.
  };
}
