import { IBucket } from 'aws-cdk-lib/aws-s3';
import { Effect, Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { StorageAction, StoragePath } from './types.js';

export type Permission = {
  actions: StorageAction[];
  /**
   * An s3 prefix that defines the scope of the actions
   */
  resources: string[];
};

/**
 * Generates IAM policies scoped to a single bucket
 */
export class StorageAccessPolicyFactory {
  private readonly namePrefix = 'storageAccess';
  private readonly stack: Stack;

  private policyCount = 1;

  /**
   * Instantiate with the bucket to generate policies for
   */
  constructor(private readonly bucket: IBucket) {
    this.stack = Stack.of(bucket);
  }

  createPolicy = (
    permissions: Map<
      StorageAction,
      { allow: Set<StoragePath>; deny: Set<StoragePath> }
    >
  ) => {
    if (permissions.size === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }

    const statements: PolicyStatement[] = [];

    permissions.forEach(
      ({ allow: allowPrefixes, deny: denyPrefixes }, action) => {
        if (allowPrefixes.size > 0) {
          statements.push(
            this.getStatement(allowPrefixes, action, Effect.ALLOW)
          );
        }
        if (denyPrefixes.size > 0) {
          statements.push(this.getStatement(denyPrefixes, action, Effect.DENY));
        }
      }
    );

    if (statements.length === 0) {
      // this could happen if the Map contained entries but all of the path sets were empty
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }

    return new Policy(this.stack, `${this.namePrefix}${this.policyCount++}`, {
      statements,
    });
  };

  private getStatement = (
    s3Prefixes: Readonly<Set<StoragePath>>,
    action: StorageAction,
    effect: Effect
  ) =>
    new PolicyStatement({
      effect,
      actions: actionMap[action],
      resources: Array.from(s3Prefixes).map(
        (s3Prefix) => `${this.bucket.bucketArn}${s3Prefix}`
      ),
    });
}

const actionMap: Record<StorageAction, string[]> = {
  read: ['s3:GetObject'],
  write: ['s3:PutObject'],
  delete: ['s3:DeleteObject'],
};
