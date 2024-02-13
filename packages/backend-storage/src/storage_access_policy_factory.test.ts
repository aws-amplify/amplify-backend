import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { beforeEach, describe, it } from 'node:test';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import { AccountPrincipal, Policy, Role } from 'aws-cdk-lib/aws-iam';

void describe('StorageAccessPolicyFactory', () => {
  let bucket: Bucket;
  let stack: Stack;

  beforeEach(() => {
    ({ stack, bucket } = createStackAndBucket());
  });
  void it('throws if no permissions are specified', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    assert.throws(() => bucketPolicyFactory.createPolicy([]));
  });
  void it('returns policy with read actions', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['read'],
        resources: ['/some/prefix/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:GetObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/some/prefix/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });
  void it('returns policy with write actions', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['write'],
        resources: ['/some/prefix/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:PutObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/some/prefix/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });

  void it('returns policy with delete actions', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['delete'],
        resources: ['/some/prefix/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:DeleteObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/some/prefix/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });

  void it('handles multiple prefix paths on same action', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['read'],
        resources: ['/some/prefix/*', '/another/path/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:GetObject',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                    },
                    '/some/prefix/*',
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                    },
                    '/another/path/*',
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  void it('handles different actions on different prefixes', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['read'],
        resources: ['/some/prefix/*'],
      },
      {
        actions: ['write'],
        resources: ['/another/path/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 's3:GetObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/some/prefix/*',
                ],
              ],
            },
          },
          {
            Action: 's3:PutObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/another/path/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });

  void it('handles multiple actions on the same prefix', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy([
      {
        actions: ['read', 'write', 'delete'],
        resources: ['/some/prefix/*'],
      },
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    policy.attachToRole(
      new Role(stack, 'testRole', { assumedBy: new AccountPrincipal('1234') })
    );

    assert.ok(policy instanceof Policy);

    const template = Template.fromStack(Stack.of(bucket));
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: ['s3:GetObject', 's3:PutObject', 's3:DeleteObject'],
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/some/prefix/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });
});

const createStackAndBucket = (): { stack: Stack; bucket: Bucket } => {
  const app = new App();
  const stack = new Stack(app);
  return {
    stack,
    bucket: new Bucket(stack, 'testBucket'),
  };
};
