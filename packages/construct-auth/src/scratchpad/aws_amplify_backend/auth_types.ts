import { CfnIdentityPool, UserPool } from 'aws-cdk-lib/aws-cognito';
import { IPolicy, IRole, Policy } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import { AmplifyConstruct, FeatureBuilder } from './base_types.js';

type AuthProps = {
  /**
   * How users will sign in to your app
   */
  loginMechanisms: ('username' | 'email' | 'phone')[];
};

/**
 * Events that Auth emits in the cloud
 */
type AuthEvent =
  | 'createAuthChallenge'
  | 'customEmailSender'
  | 'customMessage'
  | 'customSmsSender'
  | 'defineAuthChallenge'
  | 'postAuthentication'
  | 'postConfirmation'
  | 'preAuthentication'
  | 'preSignUp'
  | 'preTokenGeneration'
  | 'userMigration'
  | 'verifyAuthChallengeResponse';
type AuthRole = 'authenticatedUsers' | 'unauthenticatedUsers';
type AuthAction = 'create' | 'read' | 'update' | 'delete' | 'list';
type AuthScope = undefined;
type AuthResources = {
  userPool: UserPool;
  authenticatedRole: IRole;
  unauthenticatedRole: IRole;
  identityPool: CfnIdentityPool;
};

class AuthConstruct
  extends Construct
  implements
    AmplifyConstruct<AuthEvent, AuthRole, AuthAction, AuthScope, AuthResources>
{
  resources: AuthResources;

  constructor(scope: Construct, name: string, props: AuthProps) {
    super(scope, name);
  }

  onCloudEvent(event: AuthEvent, handler: IFunction) {
    return this;
  }

  grant(role: AuthRole, policy: IPolicy) {
    return this;
  }

  actions(actions: AuthAction[], scopes?: AuthScope[]) {
    return new Policy(this, 'policy');
  }
}
/**
 * Configure authentication for your app
 */
export const Auth: FeatureBuilder<
  AuthProps,
  AuthEvent,
  AuthRole,
  AuthAction,
  AuthScope,
  AuthResources
> = (props: AuthProps) => (ctx, name) => {
  return new AuthConstruct(ctx.getScope(), name, props);
};
