import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';
import { BackendSecretResourceFactory } from './backend_secret_resource_factory.js';

/**
 * Resolves a backend secret to a CFN token via a lambda-backed CFN custom resource.
 */
export class CfnTokenBackendSecret implements BackendSecret {
  /**
   * The name of the secret to fetch.
   */
  constructor(
    private readonly name: string,
    private readonly secretResourceFactory: BackendSecretResourceFactory
  ) {}
  /**
   * Get a reference to the value within a CDK scope.
   */
  resolve = (
    scope: Construct,
    backendIdentifier: UniqueBackendIdentifier
  ): SecretValue => {
    const secretResource = this.secretResourceFactory.getOrCreate(
      scope,
      this.name,
      backendIdentifier
    );

    const val = secretResource.getAttString('secretValue');
    return SecretValue.unsafePlainText(val); // not unsafe since 'val' is a cdk token.
  };
}
