import { AmplifyFault } from '@aws-amplify/platform-core';
import { Aspects, CfnElement, IAspect, Stack, StackProps } from 'aws-cdk-lib';
import { Role } from 'aws-cdk-lib/aws-iam';
import { Construct, IConstruct } from 'constructs';

/**
 * Props for root CDK Stack
 * @see {@link https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.StackProps.html | AWS documentation for aws-cdk-lib.StackProps}
 *
 * Props are picked to ensure explicit addition of new StackProps is required.
 * Props incompatible with Amplify's intended Stack hierarchy, build or deployment processes should always be ommited:
 * - stackName: Conflicts with dynamic resource naming.
 * - synthesizer: Conflicts with managed deployments and resource references.
 * - terminationProtection: Conflicts with sandbox/app delete.
 * - permissionsBoundary: Conflicts with single root Stack ethos (i.e. Unable to create Role prior to `defineBackend`).
 *
 * Props are passed down from `defineBackend`:
 * @example <caption>Set explicit region (e.g. for `new cloudfront.experimental.EdgeFunction`)</caption>
 * ```
 * defineBackend({}, {
 *   env:
 *     region: 'us-east-1' // Any valid AWS region
 *   }
 * })
 * ```
 */
export type MainStackProps = Pick<StackProps, 'env' | 'crossRegionReferences'>;

/**
 * Amplify-specific Stack implementation to handle cross-cutting concerns for all Amplify stacks
 */
export class AmplifyStack extends Stack {
  /**
   * Default constructor
   */
  constructor(scope: Construct, id: string, props?: MainStackProps) {
    super(scope, id, props);
    Aspects.of(this).add(new CognitoRoleTrustPolicyValidator());
  }
  /**
   * Overrides Stack.allocateLogicalId to prevent redundant nested stack logical IDs
   */
  allocateLogicalId = (element: CfnElement): string => {
    // Nested stack logical IDs have a redundant structure of <name>NestedStack<name>NestedStackResource<hash>
    // This rewrites the nested stack logical ID to <name><hash>
    const defaultId = super.allocateLogicalId(element);
    const match = /(?<name>.*)NestedStack.+NestedStackResource(?<hash>.*)/.exec(
      defaultId
    );
    if (match && match.groups && Object.keys(match.groups || {}).length === 2) {
      return `${match.groups.name}${match.groups.hash}`;
    }
    return defaultId;
  };
}

class CognitoRoleTrustPolicyValidator implements IAspect {
  visit = (node: IConstruct) => {
    if (!(node instanceof Role)) {
      return;
    }
    const assumeRolePolicyDocument = node.assumeRolePolicy?.toJSON();
    if (!assumeRolePolicyDocument) {
      return;
    }

    assumeRolePolicyDocument.Statement.forEach(
      this.cognitoTrustPolicyStatementValidator
    );
  };

  private cognitoTrustPolicyStatementValidator = ({
    Action: action,
    Condition: condition,
    Effect: effect,
    Principal: principal,
  }: {
    // These property names come from the IAM policy document which we do not control
    /* eslint-disable @typescript-eslint/naming-convention */
    Action: string;
    Condition?: Record<string, Record<string, string>>;
    Effect: 'Allow' | 'Deny';
    Principal?: { Federated?: string };
    /* eslint-enable @typescript-eslint/naming-convention */
  }) => {
    if (action !== 'sts:AssumeRoleWithWebIdentity') {
      return;
    }
    if (principal?.Federated !== 'cognito-identity.amazonaws.com') {
      return;
    }
    if (effect === 'Deny') {
      return;
    }
    // if we got here, we have a policy that allows AssumeRoleWithWebIdentity with Cognito
    // need to validate that the policy has an appropriate condition

    const audCondition =
      condition?.StringEquals?.['cognito-identity.amazonaws.com:aud'];
    if (typeof audCondition !== 'string' || audCondition.length === 0) {
      throw new AmplifyFault('InvalidTrustPolicyFault', {
        message:
          'Cannot create a Role trust policy with Cognito that does not have a StringEquals condition for cognito-identity.amazonaws.com:aud',
      });
    }

    const amrCondition =
      condition?.['ForAnyValue:StringLike']?.[
        'cognito-identity.amazonaws.com:amr'
      ];
    if (typeof amrCondition !== 'string' || amrCondition.length === 0) {
      throw new AmplifyFault('InvalidTrustPolicyFault', {
        message:
          'Cannot create a Role trust policy with Cognito that does not have a StringLike condition for cognito-identity.amazonaws.com:amr',
      });
    }
  };
}
