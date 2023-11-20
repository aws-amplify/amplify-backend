import {
  type BackendIdentifier,
  type BackendSecret,
  type BackendSecretResolver,
} from '@aws-amplify/plugin-types';
import { type SecretValue } from 'aws-cdk-lib';
import { type Construct } from 'constructs';

/**
 * DefaultBackendSecretResolver resolves a backend secret.
 */
export class DefaultBackendSecretResolver implements BackendSecretResolver {
  /**
   * Creates a DefaultBackendSecretResolver instance.
   */
  constructor(
    private readonly scope: Construct,
    private readonly backendId: BackendIdentifier
  ) {}

  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(this.scope, this.backendId);
  };
}
