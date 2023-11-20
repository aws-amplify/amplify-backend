import {
  type BackendIdentifier,
  type BackendSecret,
  type BackendSecretResolver,
} from '@aws-amplify/plugin-types';
import { type SecretValue } from 'aws-cdk-lib';
import { type Construct } from 'constructs';

/**
 * Stub implementation of BackendSecretResolver. Currently, it is copied from @aws-amplify/backend, but it does not need to be kept in sync moving forward
 */
export class BackendSecretResolverStub implements BackendSecretResolver {
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
