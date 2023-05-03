import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  UserPool,
  UserPoolClient,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';
import { IRole, Policy, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AmplifyConstruct,
  AmplifyContext,
  ConstructBuilder,
  RuntimeEntity,
  WithAccess,
  WithEvents,
  WithOverride,
} from './base_types.js';

type AuthConstructProps = {
  loginMechanisms: ('username' | 'email' | 'phone')[];
};

type AuthBuilderProps = AuthConstructProps &
  WithOverride<AuthResources> &
  WithEvents<AuthEvent> &
  WithAccess<AuthScope, AuthAction>;

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
type AuthRuntimeEntityName = 'authenticatedUser' | 'unauthenticatedUser';
type AuthAction = 'create' | 'read' | 'update' | 'delete' | 'list';
type AuthScope = 'users';
export type AuthResources = {
  userPool: UserPool;
  authenticatedRole: IRole;
  unauthenticatedRole: IRole;
  identityPool: CfnIdentityPool;
};
type AuthIsHandler = false;
type AuthHasDefaultRuntimeEntity = false;

class AuthConstruct
  extends Construct
  implements
    AmplifyConstruct<
      AuthRuntimeEntityName,
      AuthEvent,
      AuthAction,
      AuthScope,
      AuthResources,
      AuthIsHandler,
      AuthHasDefaultRuntimeEntity
    >
{
  userPool: UserPool;
  identityPool: CfnIdentityPool;
  webClient: UserPoolClient;
  authenticatedRole: IRole;
  unauthenticatedRole: IRole;

  constructor(
    scope: Construct,
    private readonly name: string,
    props: AuthConstructProps
  ) {
    super(scope, name);
    this.userPool = new UserPool(this, `${name}UserPool`, {});
    this.webClient = this.userPool.addClient('webClient', {});
    this.identityPool = new CfnIdentityPool(this, `${name}IdP`, {
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: this.webClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    this.authenticatedRole = new Role(this, `${name}AuthRole`, {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });

    this.unauthenticatedRole = new Role(this, `${name}UnauthRole`, {
      assumedBy: new ServicePrincipal('cognito-identity.amazonaws.com'),
    });

    new CfnIdentityPoolRoleAttachment(this, `${name}Roles`, {
      identityPoolId: this.identityPool.attrName,
      roles: {
        authenticated: this.authenticatedRole.roleArn,
        unauthenticated: this.unauthenticatedRole.roleArn,
      },
    });
  }

  grant(entity: RuntimeEntity, actions: AuthAction[], scope: AuthScope): void {
    const policy = new Policy(this, `${this.name}Policy`); // construct policy based on actions, scope and entity discriminant
    entity.role.attachInlinePolicy(policy);
  }

  setTrigger(eventName: AuthEvent, handler: IFunction): void {
    this.userPool.addTrigger(UserPoolOperation.of(eventName), handler);
  }

  supplyRuntimeEntity(runtimeEntityName: AuthRuntimeEntityName): RuntimeEntity {
    switch (runtimeEntityName) {
      case 'authenticatedUser':
        return {
          role: this.authenticatedRole,
          discriminant: 'cognito-identity.amazonaws.com:sub',
        };
      case 'unauthenticatedUser':
        return {
          role: this.authenticatedRole,
          discriminant: 'cognito-identity.amazonaws.com:sub',
        };
    }
  }
}

export const Auth = AuthBuilder;

class AuthBuilder
  implements
    ConstructBuilder<
      AuthRuntimeEntityName,
      AuthEvent,
      AuthAction,
      AuthScope,
      AuthResources,
      AuthIsHandler,
      AuthHasDefaultRuntimeEntity
    >
{
  private construct: AuthConstruct;

  constructor(private readonly props: AuthBuilderProps) {}

  build(ctx: AmplifyContext, name: string) {
    // if already initialized, return singleton instance
    if (this.construct) {
      return this.construct;
    }

    // initialize this construct
    this.construct = new AuthConstruct(ctx.getScope(), name, this.props);

    if (this.props.events) {
      Object.entries(this.props.events).forEach(
        ([eventName, handlerBuilder]) => {
          this.construct.setTrigger(
            eventName as AuthEvent,
            handlerBuilder.build(ctx, `${name}${eventName}Handler`)
          );
        }
      );
    }

    if (this.props.access) {
      Object.entries(this.props.access).forEach(
        ([scopeName, accessDefinition]) => {
          for (const def of accessDefinition) {
            const runtimeEntity =
              typeof def.allow === 'function'
                ? def.allow(ctx, `${name}${scopeName}Access`)
                : def.allow
                    .build(ctx, `${name}${scopeName}Access`)
                    .supplyRuntimeEntity();
            this.construct.grant(
              runtimeEntity,
              def.actions,
              scopeName as AuthScope
            );
          }
        }
      );
    }
    return this.construct;
  }

  authenticatedUser(ctx: AmplifyContext, name: string): RuntimeEntity {
    return this.build(ctx, name).supplyRuntimeEntity('authenticatedUser');
  }

  unauthenticatedUser(ctx: AmplifyContext, name: string): RuntimeEntity {
    return this.build(ctx, name).supplyRuntimeEntity('unauthenticatedUser');
  }
}
