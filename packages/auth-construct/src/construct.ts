import { Construct } from 'constructs';
import { aws_cognito as cognito, Stack } from 'aws-cdk-lib';
import {
  AuthResourceProvider,
  BackendOutputStorageStrategy,
  BackendOutputWriter,
} from '@aws-amplify/plugin-types';
import {
  UserPool,
  UserPoolClient,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, IRole, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput } from '@aws-amplify/backend-output-schemas/auth';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { AmplifyAuthProps } from './types.js';

type DefaultRoles = { auth: Role; unAuth: Role };

/**
 * Amplify Auth CDK Construct
 */
export class AmplifyAuth
  extends Construct
  implements BackendOutputWriter, AuthResourceProvider
{
  public readonly resources;
  /**
   * Create a new Auth construct with AuthProps
   */
  constructor(scope: Construct, id: string, props: AmplifyAuthProps) {
    super(scope, id);

    // UserPool
    const userPoolProps: UserPoolProps = this.getUserPoolProps(props);
    const userPool = new cognito.UserPool(this, 'UserPool', userPoolProps);

    // UserPool Client
    const userPoolClientWeb = new cognito.UserPoolClient(
      this,
      'UserPoolWebClient',
      {
        userPool: userPool,
      }
    );

    // Auth / UnAuth Roles
    const { auth, unAuth } = this.setupAuthAndUnAuthRoles();

    // Identity Pool
    const { identityPool, identityPoolRoleAttachment } = this.setupIdentityPool(
      { auth, unAuth },
      userPool,
      userPoolClientWeb
    );

    // expose resources
    this.resources = {
      userPool,
      userPoolClientWeb,
      authenticatedUserIamRole: auth,
      unauthenticatedUserIamRole: unAuth,
      cfnResources: {
        identityPool,
        identityPoolRoleAttachment,
      },
    };
  }

  /**
   * Create Auth/UnAuth Roles
   * @returns DefaultRoles
   */
  setupAuthAndUnAuthRoles(): DefaultRoles {
    const result: DefaultRoles = {
      auth: new Role(this, 'authenticatedUserRole', {
        assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
      }),
      unAuth: new Role(this, 'unauthenticatedUserRole', {
        assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
      }),
    };
    return result;
  }

  /**
   * Setup Identity Pool with default roles/role mappings, and register providers
   * @param roles DefaultRoles
   * @param userPool UserPool
   * @param userPoolClient UserPoolClient
   */
  setupIdentityPool(
    roles: DefaultRoles,
    userPool: UserPool,
    userPoolClient: UserPoolClient
  ) {
    // setup identity pool
    const region = Stack.of(this).region;
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
    });
    const identityPoolRoleAttachment =
      new cognito.CfnIdentityPoolRoleAttachment(
        this,
        'IdentityPoolRoleAttachment',
        {
          identityPoolId: identityPool.logicalId,
          roles: {
            unauthenticated: roles.unAuth.roleArn,
            authenticated: roles.auth.roleArn,
          },
          roleMappings: {
            UserPoolWebClientRoleMapping: {
              type: 'Token',
              ambiguousRoleResolution: 'AuthenticatedRole',
              identityProvider: `cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}:${userPoolClient.userPoolClientId}`,
            },
          },
        }
      );
    identityPoolRoleAttachment.addDependency(identityPool);
    identityPoolRoleAttachment.node.addDependency(userPoolClient);
    // add cognito provider
    identityPool.cognitoIdentityProviders = [
      {
        clientId: userPoolClient.userPoolClientId,
        providerName: `cognito-idp.${region}.amazonaws.com/${userPool.userPoolProviderName}`,
      },
    ];
    return {
      identityPool,
      identityPoolRoleAttachment,
    };
  }

  /**
   * Process props into UserPoolProps (set defaults if needed)
   * @param props AmplifyAuthProps
   * @returns UserPoolProps
   */
  getUserPoolProps(props: AmplifyAuthProps): UserPoolProps {
    const login = props.loginOptions.basic;
    const userPoolProps: UserPoolProps = {
      signInCaseSensitive: false,
      signInAliases: {
        phone: login.phoneNumber?.enabled,
        email: login.email?.enabled,
      },
    };
    return userPoolProps;
  }

  /**
   * Stores auth output using the provided strategy
   */
  storeOutput(
    outputStorageStrategy: BackendOutputStorageStrategy<AuthOutput>
  ): void {
    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: {
        userPoolId: this.resources.userPool.userPoolId,
        webClientId: this.resources.userPoolClientWeb.userPoolClientId,
        authRegion: Stack.of(this).region,
      },
    });
  }
}
