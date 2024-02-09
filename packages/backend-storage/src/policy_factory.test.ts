import { App, Stack } from 'aws-cdk-lib';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { beforeEach, describe, it } from 'node:test';
import { BucketPolicyFactory } from './policy_factory.js';
import assert from 'node:assert';
import { Template } from 'aws-cdk-lib/assertions';
import { AccountPrincipal, Policy, Role } from 'aws-cdk-lib/aws-iam';

void describe('BucketPolicyFactory', () => {
  let bucket: Bucket;
  let stack: Stack;

  beforeEach(() => {
    ({ stack, bucket } = createStackAndBucket());
  });
  void it('throws if no permissions are specified', () => {
    const bucketPolicyFactory = new BucketPolicyFactory(bucket);
    assert.throws(() => bucketPolicyFactory.createPolicy([]));
  });
  void it('returns policy with read actions', () => {
    const bucketPolicyFactory = new BucketPolicyFactory(bucket);
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
            Action: ['s3:GetObject', 's3:ListBucket'],
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
    const bucketPolicyFactory = new BucketPolicyFactory(bucket);
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
    const bucketPolicyFactory = new BucketPolicyFactory(bucket);
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

  void it('handles multiple prefix paths', () => {
    const bucketPolicyFactory = new BucketPolicyFactory(bucket);
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
            Action: ['s3:GetObject', 's3:ListBucket'],
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
});

const createStackAndBucket = (): { stack: Stack; bucket: Bucket } => {
  const app = new App();
  const stack = new Stack(app);
  return {
    stack,
    bucket: new Bucket(stack, 'testBucket'),
  };
};
