import { IBucket } from 'aws-cdk-lib/aws-s3';
import { StorageAction } from './access_builder.js';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault } from '@aws-amplify/platform-core';
import { S3Prefix } from './action_to_resources_map.js';

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
    permissions: Readonly<Map<StorageAction, Readonly<Set<S3Prefix>>>>
  ) => {
    if (permissions.size === 0) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }

    const statements: PolicyStatement[] = [];

    permissions.forEach((s3Prefixes, action) => {
      statements.push(this.getStatement(s3Prefixes, action));
    });
    return new Policy(this.stack, `${this.namePrefix}${this.policyCount++}`, {
      statements: statements,
    });
  };

  private getStatement = (
    s3Prefixes: Readonly<Set<S3Prefix>>,
    action: StorageAction
  ) =>
    new PolicyStatement({
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
