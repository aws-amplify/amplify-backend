import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  UserPool,
  UserPoolClient,
  UserPoolOperation,
} from 'aws-cdk-lib/aws-cognito';
import { Fn } from 'aws-cdk-lib';
import { IRole, Policy, Role, FederatedPrincipal } from 'aws-cdk-lib/aws-iam';
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
import { aws_ses as ses } from 'aws-cdk-lib';

type AuthConstructProps = {
  loginMechanisms: ('username' | 'email' | 'phone')[];
};

type AuthRuntimeEntityName = 'authenticatedUser' | 'unauthenticatedUser';
type AuthAction = 'create' | 'read' | 'update' | 'delete' | 'list';
type AuthScope = 'users';
export type AuthResources = {
  userPool: UserPool;
  authenticatedRole: IRole;
  unauthenticatedRole: IRole;
  /*
  lib/auth_types.ts:62:7 - error TS2344: Type 'AuthResources' does not satisfy the constraint 'Record<string, IResource>'.
  Property 'identityPool' is incompatible with index signature.
    Property 'env' is missing in type 'CfnIdentityPool' but required in type 'IResource'.
   */
  //identityPool: CfnIdentityPool;
};
type AuthIsHandler = false;
type AuthHasDefaultRuntimeEntity = false;

export class AuthConstruct extends Construct {
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
    this.userPool = new UserPool(this, `${name}UserPool`, {
      signInCaseSensitive: true,
      signInAliases: {
        email: props.loginMechanisms.includes('email'),
      },
      selfSignUpEnabled: true,
    });
    this.webClient = this.userPool.addClient(`${name}webClient`, {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      generateSecret: false,
    });

    this.identityPool = new CfnIdentityPool(
      this,
      `${name.replace('-', '')}IdP`,
      {
        allowUnauthenticatedIdentities: true,
        cognitoIdentityProviders: [
          {
            clientId: this.webClient.userPoolClientId,
            providerName: this.userPool.userPoolProviderName,
          },
        ],
      }
    );

    this.authenticatedRole = new Role(this, `${name}AuthRole`, {
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
    });

    this.unauthenticatedRole = new Role(this, `${name}UnauthRole`, {
      assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
    });

    new CfnIdentityPoolRoleAttachment(this, `${name}Roles`, {
      identityPoolId: this.identityPool.ref,
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

  addTrigger(eventName: UserPoolOperation, handler: IFunction): void {
    this.userPool.addTrigger(eventName, handler);
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
