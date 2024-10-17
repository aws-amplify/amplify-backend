import { afterEach, beforeEach, describe } from 'node:test';
import { e2eToolingClientConfig } from '../e2e_tooling_client_config.js';
import {
  CognitoIdentityProviderClient,
  CreateIdentityProviderCommand,
  CreateUserPoolClientCommand,
  CreateUserPoolCommand,
  CreateUserPoolDomainCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  CreateRoleCommand,
  IAMClient,
  PutRolePolicyCommand,
} from '@aws-sdk/client-iam';
import {
  CognitoIdentityClient,
  CreateIdentityPoolCommand,
} from '@aws-sdk/client-cognito-identity';
import { shortUuid } from '../short_uuid.js';
import {
  Effect,
  FederatedPrincipal,
  PolicyDocument,
  PolicyStatement,
} from 'aws-cdk-lib/aws-iam';

const cognitoUserPoolClient = new CognitoIdentityProviderClient(
  e2eToolingClientConfig
);
const cognitoIdentityClient = new CognitoIdentityClient(e2eToolingClientConfig);
const iamClient = new IAMClient(e2eToolingClientConfig);

const createUserPoolResponse = await cognitoUserPoolClient.send(
  new CreateUserPoolCommand({
    PoolName: `RefUserPool${shortUuid()}`,
    AccountRecoverySetting: {
      RecoveryMechanisms: [
        {
          Name: 'verified_email',
          Priority: 1,
        },
      ],
    },
    AdminCreateUserConfig: {
      AllowAdminCreateUserOnly: false,
    },
    AliasAttributes: [],
    AutoVerifiedAttributes: ['email'],
    UserAttributeUpdateSettings: {
      AttributesRequireVerificationBeforeUpdate: ['email'],
    },
    EmailConfiguration: {
      EmailSendingAccount: 'COGNITO_DEFAULT',
    },
    Schema: [
      {
        Name: 'email',
        Required: true,
      },
    ],
    Policies: {
      PasswordPolicy: {
        MinimumLength: 8,
        RequireUppercase: true,
        RequireLowercase: true,
        RequireNumbers: true,
        RequireSymbols: true,
        TemporaryPasswordValidityDays: 7,
      },
    },
    UsernameAttributes: ['email'],
    UsernameConfiguration: {
      CaseSensitive: false,
    },
    MfaConfiguration: 'OFF',
    DeletionProtection: 'ACTIVE',
    UserPoolTags: {},
  })
);
const userPoolId = createUserPoolResponse.UserPool?.Id;
const createUserPoolClientResponse = await cognitoUserPoolClient.send(
  new CreateUserPoolClientCommand({
    ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
    AuthSessionValidity: 3,
    RefreshTokenValidity: 30,
    AccessTokenValidity: 60,
    IdTokenValidity: 60,
    TokenValidityUnits: {
      RefreshToken: 'days',
      AccessToken: 'minutes',
      IdToken: 'minutes',
    },
    EnableTokenRevocation: true,
    PreventUserExistenceErrors: 'ENABLED',
    AllowedOAuthFlows: ['code'],
    AllowedOAuthScopes: ['openid', 'phone', 'email'],
    SupportedIdentityProviders: ['COGNITO', 'Facebook', 'Google'],
    CallbackURLs: ['https://callback.com'],
    LogoutURLs: ['https://logout.com'],
    AllowedOAuthFlowsUserPoolClient: true,
    ClientName: `ref-auth-client-${shortUuid()}`,
    UserPoolId: userPoolId,
    GenerateSecret: false,
    ReadAttributes: [
      'address',
      'birthdate',
      'email',
      'email_verified',
      'family_name',
      'gender',
      'given_name',
      'locale',
      'middle_name',
      'name',
      'nickname',
      'phone_number',
      'phone_number_verified',
      'picture',
      'preferred_username',
      'profile',
      'updated_at',
      'website',
      'zoneinfo',
    ],
    WriteAttributes: [
      'address',
      'birthdate',
      'email',
      'family_name',
      'gender',
      'given_name',
      'locale',
      'middle_name',
      'name',
      'nickname',
      'phone_number',
      'picture',
      'preferred_username',
      'profile',
      'updated_at',
      'website',
      'zoneinfo',
    ],
  })
);
const userPoolClientId = createUserPoolClientResponse.UserPoolClient?.ClientId;
await cognitoUserPoolClient.send(
  new CreateUserPoolDomainCommand({
    UserPoolId: userPoolId,
    Domain: `ref-auth-${shortUuid()}`,
  })
);
await cognitoUserPoolClient.send(
  new CreateIdentityProviderCommand({
    UserPoolId: userPoolId,
    ProviderType: 'Facebook',
    ProviderDetails: {
      client_id: 'clientId',
      client_secret: 'clientSecret',
      authorize_scopes: 'openid,email',
      api_version: 'v17.0',
    },
    AttributeMapping: {
      email: 'email',
    },
    ProviderName: 'Facebook',
  })
);
await cognitoUserPoolClient.send(
  new CreateIdentityProviderCommand({
    UserPoolId: userPoolId,
    ProviderType: 'Google',
    ProviderDetails: {
      client_id: 'clientId',
      client_secret: 'clientSecret',
      authorize_scopes: 'openid,email',
    },
    AttributeMapping: {
      email: 'email',
    },
    ProviderName: 'Google',
  })
);
const createIdentityPool = await cognitoIdentityClient.send(
  new CreateIdentityPoolCommand({
    AllowUnauthenticatedIdentities: true,
    IdentityPoolName: `ref-auth-ip-${shortUuid()}`,
    AllowClassicFlow: false,
    IdentityPoolTags: {},
    CognitoIdentityProviders: [
      {
        ClientId: userPoolClientId,
        ProviderName: createUserPoolResponse.UserPool?.Name,
        ServerSideTokenCheck: false,
      },
    ],
    SupportedLoginProviders: {
      'graph.facebook.com': 'clientId',
      'accounts.google.com': 'clientId',
    },
  })
);
const createAuthRoleResponse = await iamClient.send(
  new CreateRoleCommand({
    RoleName: `ref-auth-role-${shortUuid()}`,
    AssumeRolePolicyDocument: new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [
            new FederatedPrincipal('cognito-identity.amazonaws.com'),
          ],
          actions: ['sts:AssumeRoleWithWebIdentity'],
          conditions: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud':
                createIdentityPool.IdentityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
        }),
      ],
    }).toString(),
  })
);
await iamClient.send(
  new PutRolePolicyCommand({
    PolicyDocument: new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cognito-identity:GetCredentialsForIdentity'],
          resources: ['*'],
        }),
      ],
    }).toString(),
    PolicyName: `ref-auth-idp-policy-${shortUuid()}`,
    RoleName: createAuthRoleResponse.Role?.RoleName,
  })
);
const createUnauthRoleResponse = await iamClient.send(
  new CreateRoleCommand({
    RoleName: `ref-unauth-role-${shortUuid()}`,
    AssumeRolePolicyDocument: new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          principals: [
            new FederatedPrincipal('cognito-identity.amazonaws.com'),
          ],
          actions: ['sts:AssumeRoleWithWebIdentity'],
          conditions: {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud':
                createIdentityPool.IdentityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'unauthenticated',
            },
          },
        }),
      ],
    }).toString(),
  })
);
await iamClient.send(
  new PutRolePolicyCommand({
    PolicyDocument: new PolicyDocument({
      statements: [
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['cognito-identity:GetCredentialsForIdentity'],
          resources: ['*'],
        }),
      ],
    }).toString(),
    PolicyName: `ref-auth-idp-policy-${shortUuid()}`,
    RoleName: createUnauthRoleResponse.Role?.RoleName,
  })
);

void describe('reference tests', () => {
  beforeEach(async () => {
    // create resources
  });

  afterEach(async () => {
    // destroy resources
  });
});
