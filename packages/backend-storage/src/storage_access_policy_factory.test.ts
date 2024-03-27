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
    assert.throws(() => bucketPolicyFactory.createPolicy(new Map()));
  });
  void it('returns policy with read actions', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy(
      new Map([['get', { allow: new Set(['some/prefix/*']), deny: new Set() }]])
    );

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
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        ['write', { allow: new Set(['some/prefix/*']), deny: new Set() }],
      ])
    );

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
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        ['delete', { allow: new Set(['some/prefix/*']), deny: new Set() }],
      ])
    );

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
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        [
          'get',
          {
            allow: new Set(['some/prefix/*', 'another/path/*']),
            deny: new Set(),
          },
        ],
      ])
    );

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
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        ['get', { allow: new Set(['some/prefix/*']), deny: new Set() }],
        ['write', { allow: new Set(['another/path/*']), deny: new Set() }],
      ])
    );

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
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        ['get', { allow: new Set(['some/prefix/*']), deny: new Set() }],
        ['write', { allow: new Set(['some/prefix/*']), deny: new Set() }],
        ['delete', { allow: new Set(['some/prefix/*']), deny: new Set() }],
      ])
    );

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
                  '/some/prefix/*',
                ],
              ],
            },
          },
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

  void it('handles deny on single action', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        ['get', { allow: new Set(['foo/*', 'foo/bar/*']), deny: new Set() }],
        ['write', { allow: new Set(['foo/*']), deny: new Set(['foo/bar/*']) }],
      ])
    );

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
                    '/foo/*',
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
                    '/foo/bar/*',
                  ],
                ],
              },
            ],
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
                  '/foo/*',
                ],
              ],
            },
          },
          {
            Effect: 'Deny',
            Action: 's3:PutObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/foo/bar/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });

  void it('handles deny on multiple actions for the same path', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        [
          'get',
          {
            allow: new Set(['foo/*']),
            deny: new Set(['foo/bar/*']),
          },
        ],
        ['write', { allow: new Set(['foo/*']), deny: new Set(['foo/bar/*']) }],
      ])
    );

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
                  '/foo/*',
                ],
              ],
            },
          },
          {
            Effect: 'Deny',
            Action: 's3:GetObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/foo/bar/*',
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
                  '/foo/*',
                ],
              ],
            },
          },
          {
            Effect: 'Deny',
            Action: 's3:PutObject',
            Resource: {
              'Fn::Join': [
                '',
                [
                  {
                    'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                  },
                  '/foo/bar/*',
                ],
              ],
            },
          },
        ],
      },
    });
  });

  void it('handles deny for same action on multiple paths', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        [
          'get',
          {
            allow: new Set(['foo/*']),
            deny: new Set(['foo/bar/*', 'other/path/*', 'something/else/*']),
          },
        ],
      ])
    );

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
                  '/foo/*',
                ],
              ],
            },
          },
          {
            Effect: 'Deny',
            Action: 's3:GetObject',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
                    },
                    '/foo/bar/*',
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
                    '/other/path/*',
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
                    '/something/else/*',
                  ],
                ],
              },
            ],
          },
        ],
      },
    });
  });

  void it('handles allow and deny on "list" action', () => {
    const bucketPolicyFactory = new StorageAccessPolicyFactory(bucket);
    const policy = bucketPolicyFactory.createPolicy(
      new Map([
        [
          'list',
          {
            allow: new Set(['some/prefix/*']),
            deny: new Set(['some/prefix/subpath/*']),
          },
        ],
      ])
    );

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
            Action: 's3:ListBucket',
            Resource: {
              'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
            },
            Condition: {
              StringLike: {
                's3:prefix': ['some/prefix/*', 'some/prefix/'],
              },
            },
          },
          {
            Action: 's3:ListBucket',
            Effect: 'Deny',
            Resource: {
              'Fn::GetAtt': ['testBucketDF4D7D1A', 'Arn'],
            },
            Condition: {
              StringLike: {
                's3:prefix': ['some/prefix/subpath/*', 'some/prefix/subpath/'],
              },
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
