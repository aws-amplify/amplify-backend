import { Construct } from 'constructs';
import { aws_cognito as cognito, Stack } from 'aws-cdk-lib';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  BackendOutputWriter,
} from '@aws-amplify/plugin-types';
import {
  UserPool,
  UserPoolClient,
  UserPoolIdentityProviderAmazon,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderOidc,
  UserPoolIdentityProviderSaml,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, IRole, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput } from '@aws-amplify/backend-output-schemas/auth';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { AmplifyAuthPropsV3 as AmplifyAuthProps } from './v3.types.js';

type IDPSetupResult = {
  oauthMappings: Record<string, string>;
  google?: UserPoolIdentityProviderGoogle;
  facebook?: UserPoolIdentityProviderFacebook;
  amazon?: UserPoolIdentityProviderAmazon;
  apple?: UserPoolIdentityProviderApple;
  oidc?: UserPoolIdentityProviderOidc;
  saml?: UserPoolIdentityProviderSaml;
};

type DefaultRoles = { auth: Role; unAuth: Role };

/**
 * Amplify Auth CDK Construct
 */
export class AmplifyAuth
  extends Construct
  implements BackendOutputWriter, AuthResources
{
  readonly userPool: UserPool;
  readonly userPoolClientWeb: UserPoolClient;
  readonly authenticatedUserIamRole: IRole;
  readonly unauthenticatedUserIamRole: IRole;
  /**
   * Create a new Auth construct with AuthProps
   */
  constructor(scope: Construct, id: string, props: AmplifyAuthProps) {
    super(scope, id);
    // UserPool
    const userPoolProps: UserPoolProps = this.getUserPoolProps(props);
    this.userPool = new cognito.UserPool(this, 'UserPool', userPoolProps);

    // UserPool - Identity Providers
    const providerSetupResult = this.setupIdentityProviders(
      this.userPool,
      props.loginOptions
    );

    // UserPool Client
    this.userPoolClientWeb = new cognito.UserPoolClient(
      this,
      'UserPoolWebClient',
      {
        userPool: this.userPool,
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          callbackUrls: props.loginOptions.oauth?.callbackUrls,
          logoutUrls: props.loginOptions.oauth?.logoutUrls,
          scopes: props.loginOptions.oauth?.scopes,
        },
      }
    );
    // Auth / UnAuth Roles
    const { auth, unAuth } = this.setupAuthAndUnAuthRoles();

    // Identity Pool
    this.setupIdentityPool(
      props,
      { auth, unAuth },
      this.userPool,
      this.userPoolClientWeb,
      providerSetupResult
    );
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
   * @param props AmplifyAuthProps
   * @param roles DefaultRoles
   * @param userPool UserPool
   * @param userPoolClient UserPoolClient
   * @param providerSetupResult IDPSetupResult
   */
  setupIdentityPool(
    props: AmplifyAuthProps,
    roles: DefaultRoles,
    userPool: UserPool,
    userPoolClient: UserPoolClient,
    providerSetupResult: IDPSetupResult
  ) {
    // setup identity pool
    const region = Stack.of(this).region;
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities:
        props.identityPool?.allowUnauthenticatedIdentities ?? false,
    });
    const identityPoolRoleMap = new cognito.CfnIdentityPoolRoleAttachment(
      this,
      'IDPRA',
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
            identityProvider: `cognito-idp.${
              Stack.of(this).region
            }.amazonaws.com/${userPool.userPoolId}:${
              userPoolClient.userPoolClientId
            }`,
          },
        },
      }
    );
    identityPoolRoleMap.addDependency(identityPool);
    identityPoolRoleMap.node.addDependency(userPoolClient);
    // add cognito provider
    identityPool.cognitoIdentityProviders = [
      {
        clientId: this.userPoolClientWeb.userPoolClientId,
        providerName: `cognito-idp.${region}.amazonaws.com/${this.userPool.userPoolProviderName}`,
      },
    ];
    // add other providers
    identityPool.supportedLoginProviders = providerSetupResult.oauthMappings;
    // identityPool.openIdConnectProviderArns = providerSetupResult.oidc.; // how to get ARN?
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
      // use custom default (true) because cognito defaults to false
      selfSignUpEnabled:
        props.selfSignUpEnabled === undefined ? true : props.selfSignUpEnabled,
      autoVerify: {
        email: login.email?.enabled && login.email.autoVerify?.enabled,
        phone:
          login.phoneNumber?.enabled && login.phoneNumber.autoVerify?.enabled,
      },
      userVerification: {
        smsMessage: login.phoneNumber?.enabled
          ? login.phoneNumber.autoVerify?.smsMessage
          : undefined,
        ...(login.email?.enabled ? login.email.autoVerify : {}),
      },
    };
    return userPoolProps;
  }

  /**
   * Setup Identity Providers (OAuth/OIDC/SAML)
   * @param userPool UserPool
   * @param loginOptions AmplifyAuthProps['loginOptions']
   * @returns IDPSetupResult
   */
  setupIdentityProviders(
    userPool: UserPool,
    loginOptions: AmplifyAuthProps['loginOptions']
  ): IDPSetupResult {
    const result: IDPSetupResult = {
      oauthMappings: {},
    };

    // oauth
    const oauth = loginOptions.oauth;
    if (oauth) {
      // GOOGLE
      if (oauth.google) {
        result.google = new cognito.UserPoolIdentityProviderGoogle(
          this,
          'GoogleIdP',
          {
            userPool,
            ...oauth.google,
          }
        );
        result.oauthMappings[result.google.providerName] =
          oauth.google.clientId;
      }
    }

    // OIDC
    if (loginOptions.oidc) {
      result.oidc = new cognito.UserPoolIdentityProviderOidc(this, 'OidcIDP', {
        userPool,
        ...loginOptions.oidc,
      });
    }
    return result;
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
        userPoolId: this.userPool.userPoolId,
        webClientId: this.userPoolClientWeb.userPoolClientId,
        authRegion: Stack.of(this).region,
      },
    });
  }
}
