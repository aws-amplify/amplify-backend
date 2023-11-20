import { type Construct } from 'constructs';
import { type BackendIdentifier } from './backend_identifier.js';
import { type SecretValue } from 'aws-cdk-lib';

export type BackendSecret = {
  /**
   * Resolves the given secret to a CDK token.
   */
  resolve: (
    scope: Construct,
    backendIdentifier: BackendIdentifier
  ) => SecretValue;
};

export type BackendSecretResolver = {
  resolveSecret: (backendSecret: BackendSecret) => SecretValue;
};
