import {
  BackendSecret,
  BackendSecretResolver,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Stub implementation of BackendSecretResolver. Currently, it is copied from @aws-amplify/backend, but it does not need to be kept in sync moving forward
 */
export class BackendSecretResolverStub implements BackendSecretResolver {
  /**
   * Creates a DefaultBackendSecretResolver instance.
   */
  constructor(
    private readonly scope: Construct,
    private readonly uniqueBackendIdentifier: UniqueBackendIdentifier
  ) {}

  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(this.scope, this.uniqueBackendIdentifier);
  };
}
