import { Construct } from 'constructs';
import { SecretValue } from 'aws-cdk-lib';
import { UniqueBackendIdentifier } from '@aws-amplify/platform-core';

export type BackendSecret = {
  /**
   * Resolves the given secret to a CDK token.
   */
  resolve: (
    scope: Construct,
    uniqueBackendIdentifier: UniqueBackendIdentifier
  ) => SecretValue;
};
