import { IBucket } from 'aws-cdk-lib/aws-s3';
import { StorageAction } from './access_builder.js';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Stack } from 'aws-cdk-lib';
import { AmplifyFault } from '@aws-amplify/platform-core';

export type Permission = {
  actions: StorageAction[];
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

  createPolicy = (permissions: Permission[]) => {
    if (permissions.length < 1) {
      throw new AmplifyFault('EmptyPolicyFault', {
        message: 'At least one permission must be specified',
      });
    }
    return new Policy(this.stack, `${this.namePrefix}${this.policyCount++}`, {
      statements: permissions.map(this.getStatement),
    });
  };

  private getStatement = (permission: Permission) =>
    new PolicyStatement({
      actions: permission.actions.map((action) => actionMap[action]).flat(),
      resources: permission.resources.map(
        (s3Prefix) => `${this.bucket.bucketArn}${s3Prefix}`
      ),
    });
}

const actionMap: Record<StorageAction, string[]> = {
  read: ['s3:GetObject'],
  write: ['s3:PutObject'],
  delete: ['s3:DeleteObject'],
};
