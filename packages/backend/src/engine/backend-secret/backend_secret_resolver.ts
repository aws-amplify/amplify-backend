import {
  BackendIdentifierParts,
  BackendSecret,
  BackendSecretResolver,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * DefaultBackendSecretResolver resolves a backend secret.
 */
export class DefaultBackendSecretResolver implements BackendSecretResolver {
  /**
   * Creates a DefaultBackendSecretResolver instance.
   */
  constructor(
    private readonly scope: Construct,
    private readonly uniqueBackendIdentifier: BackendIdentifierParts
  ) {}

  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(this.scope, this.uniqueBackendIdentifier);
  };
}
