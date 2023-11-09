import { Construct } from 'constructs';
import { BackendIdentifier } from './backend_identifier.js';
import { SecretValue } from 'aws-cdk-lib';

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
