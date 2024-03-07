import { beforeEach, describe, it } from 'node:test';
import {
  AppSyncApiAction,
  AppSyncPolicyGenerator,
} from './app_sync_policy_generator.js';
import { App, Stack } from 'aws-cdk-lib';
import { GraphqlApi } from 'aws-cdk-lib/aws-appsync';
import { AccountPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { Template } from 'aws-cdk-lib/assertions';

void describe('AppSyncPolicyGenerator', () => {
  let stack: Stack;
  let graphqlApi: GraphqlApi;

  beforeEach(() => {
    const app = new App();
    stack = new Stack(app, 'testStack');
    graphqlApi = new GraphqlApi(stack, 'testApi', {
      name: 'testName',
      definition: {
        schema: {
          bind: () => ({
            apiId: 'testApi',
            definition: 'test schema',
          }),
        },
      },
    });
  });
  const singleActionTestCases: {
    action: AppSyncApiAction;
    expectedResourceSuffix: string;
  }[] = [
    {
      action: 'query',
      expectedResourceSuffix: 'Query/*',
    },
    {
      action: 'mutate',
      expectedResourceSuffix: 'Mutation/*',
    },
    {
      action: 'listen',
      expectedResourceSuffix: 'Subscription/*',
    },
  ];

  singleActionTestCases.forEach(({ action, expectedResourceSuffix }) => {
    void it(`generates policy for ${action} action`, () => {
      const policyGenerator = new AppSyncPolicyGenerator(graphqlApi);

      const queryPolicy = policyGenerator.generateGraphqlAccessPolicy([action]);

      // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
      queryPolicy.attachToRole(
        new Role(stack, 'testRole', {
          assumedBy: new AccountPrincipal('1234'),
        })
      );

      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::IAM::Policy', {
        PolicyDocument: {
          Statement: [
            {
              Action: 'appsync:GraphQL',
              Resource: {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testApiD6ECAB50', 'Arn'],
                    },
                    `/types/${expectedResourceSuffix}`,
                  ],
                ],
              },
            },
          ],
        },
      });
    });
  });

  void it('generates policy for multiple actions', () => {
    const policyGenerator = new AppSyncPolicyGenerator(graphqlApi);

    const queryPolicy = policyGenerator.generateGraphqlAccessPolicy([
      'query',
      'mutate',
      'listen',
    ]);

    // we have to attach the policy to a role, otherwise CDK erases the policy from the stack
    queryPolicy.attachToRole(
      new Role(stack, 'testRole', {
        assumedBy: new AccountPrincipal('1234'),
      })
    );

    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: [
          {
            Action: 'appsync:GraphQL',
            Resource: [
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testApiD6ECAB50', 'Arn'],
                    },
                    `/types/Query/*`,
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testApiD6ECAB50', 'Arn'],
                    },
                    `/types/Mutation/*`,
                  ],
                ],
              },
              {
                'Fn::Join': [
                  '',
                  [
                    {
                      'Fn::GetAtt': ['testApiD6ECAB50', 'Arn'],
                    },
                    `/types/Subscription/*`,
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
