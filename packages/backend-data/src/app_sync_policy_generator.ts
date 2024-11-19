import { Stack } from 'aws-cdk-lib';
import { IGraphqlApi } from 'aws-cdk-lib/aws-appsync';
import { Policy, PolicyStatement } from 'aws-cdk-lib/aws-iam';

export type AppSyncApiAction = 'query' | 'mutate' | 'listen';

/**
 * Generates policies for accessing an AppSync GraphQL API
 */
export class AppSyncPolicyGenerator {
  private readonly stack: Stack;
  private readonly policyPrefix = 'GraphqlAccessPolicy';
  private policyCount = 1;
  /**
   * Initialize with the GraphqlAPI that the policies will be scoped to
   */
  constructor(
    private readonly graphqlApi: IGraphqlApi,
    private readonly modelIntrospectionSchemaArn?: string
  ) {
    this.stack = Stack.of(graphqlApi);
  }
  /**
   * Generates a policy that grants GraphQL data-plane access to the provided actions
   *
   * The naming is a bit wonky here because the IAM action is always "appsync:GraphQL".
   * The input "action" maps to the "type" in the resource name part of the ARN which is "Query", "Mutation" or "Subscription"
   */
  generateGraphqlAccessPolicy(actions: AppSyncApiAction[]) {
    const resources = actions
      // convert from actions to GraphQL Type
      .map((action) => actionToTypeMap[action])
      // convert Type to resourceName
      .map((type) => [this.graphqlApi.arn, 'types', type, '*'].join('/'));

    const statements = [
      new PolicyStatement({
        actions: ['appsync:GraphQL'],
        resources,
      }),
    ];

    if (this.modelIntrospectionSchemaArn) {
      statements.push(
        new PolicyStatement({
          actions: ['s3:GetObject'],
          resources: [this.modelIntrospectionSchemaArn],
        })
      );
    }

    return new Policy(this.stack, `${this.policyPrefix}${this.policyCount++}`, {
      statements,
    });
  }
}

const actionToTypeMap: Record<AppSyncApiAction, string> = {
  query: 'Query',
  mutate: 'Mutation',
  listen: 'Subscription',
};
