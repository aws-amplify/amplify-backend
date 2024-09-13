import {
  BackendIdentifier,
  BackendSecret,
  ResolvePathResult,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { BackendSecretFetcherFactory } from './backend_secret_fetcher_factory.js';
import { SecretValue } from 'aws-cdk-lib';
import { ParameterPathConversions } from '@aws-amplify/platform-core';

/**
 * Resolves a backend secret to a CFN token via a lambda-backed CFN custom resource.
 */
export class CfnTokenBackendSecret implements BackendSecret {
  /**
   * The name of the secret to fetch.
   */
  constructor(
    private readonly secretName: string,
    private readonly secretResourceFactory: BackendSecretFetcherFactory
  ) {
    BackendSecretFetcherFactory.registerSecret(secretName);
  }
  /**
   * Get a reference to the value within a CDK scope.
   */
  resolve = (
    scope: Construct,
    backendIdentifier: BackendIdentifier
  ): SecretValue => {
    const secretResource = this.secretResourceFactory.getOrCreate(
      scope,
      backendIdentifier
    );

    const val = secretResource.getAttString(`${this.secretName}`);
    return SecretValue.unsafePlainText(val); // safe since 'val' is a cdk token.
  };

  /**
   * Resolve to the secret path
   */
  resolvePath = (backendIdentifier: BackendIdentifier): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        backendIdentifier,
        this.secretName
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        backendIdentifier.namespace,
        this.secretName
      ),
    };
  };
}
