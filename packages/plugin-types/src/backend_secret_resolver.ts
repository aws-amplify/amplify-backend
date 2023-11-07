import { Construct } from 'constructs';
import { UniqueBackendIdentifier } from './backend_identifier_parts.js';
import { SecretValue } from 'aws-cdk-lib';

export type BackendSecret = {
  /**
   * Resolves the given secret to a CDK token.
   */
  resolve: (
    scope: Construct,
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ) => SecretValue;
};

export type BackendSecretResolver = {
  resolveSecret: (backendSecret: BackendSecret) => SecretValue;
};
