import { IdentityPool as IdentityPoolType } from '@aws-sdk/client-cognito-identity';
import {
  GetUserPoolMfaConfigCommandOutput,
  ListGroupsResponse,
  ProviderDescription,
  UserPoolClientType,
  UserPoolType,
} from '@aws-sdk/client-cognito-identity-provider';
import { ReferenceAuthInitializerProps } from '../lambda/reference_auth_initializer.js';
/**
 * Sample referenceAuth properties
 */
export const SampleInputProperties: ReferenceAuthInitializerProps = {
  authRoleArn: 'arn:aws:iam::000000000000:role/service-role/ref-auth-role-1',
  unauthRoleArn: 'arn:aws:iam::000000000000:role/service-role/ref-unauth-role1',
  identityPoolId: 'us-east-1:sample-identity-pool-id',
  userPoolClientId: 'sampleUserPoolClientId',
  userPoolId: 'us-east-1_userpoolTest',
  groups: {
    ADMINS: 'arn:aws:iam::000000000000:role/sample-group-role',
  },
  region: 'us-east-1',
};
/**
 * Sample response from describe user pool command
 */
export const UserPool: Readonly<UserPoolType> = {
  Id: SampleInputProperties.userPoolId,
  Name: 'ref-auth-userpool-1',
  Policies: {
    PasswordPolicy: {
      MinimumLength: 10,
      RequireUppercase: true,
      RequireLowercase: true,
      RequireNumbers: true,
      RequireSymbols: false,
      TemporaryPasswordValidityDays: 7,
    },
  },
  DeletionProtection: 'ACTIVE',
  LambdaConfig: {},
  SchemaAttributes: [
    {
      Name: 'profile',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'address',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'birthdate',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '10',
        MaxLength: '10',
      },
    },
    {
      Name: 'gender',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'preferred_username',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'updated_at',
      AttributeDataType: 'Number',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      NumberAttributeConstraints: {
        MinValue: '0',
      },
    },
    {
      Name: 'website',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'picture',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'identities',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {},
    },
    {
      Name: 'sub',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: false,
      Required: true,
      StringAttributeConstraints: {
        MinLength: '1',
        MaxLength: '2048',
      },
    },
    {
      Name: 'phone_number',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'phone_number_verified',
      AttributeDataType: 'Boolean',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
    },
    {
      Name: 'zoneinfo',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      // eslint-disable-next-line spellcheck/spell-checker
      Name: 'custom:duplicateemail',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {},
    },
    {
      Name: 'locale',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'email',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: true,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'email_verified',
      AttributeDataType: 'Boolean',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
    },
    {
      Name: 'given_name',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'family_name',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'middle_name',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'name',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
    {
      Name: 'nickname',
      AttributeDataType: 'String',
      DeveloperOnlyAttribute: false,
      Mutable: true,
      Required: false,
      StringAttributeConstraints: {
        MinLength: '0',
        MaxLength: '2048',
      },
    },
  ],
  AutoVerifiedAttributes: ['email'],
  UsernameAttributes: ['email'],
  VerificationMessageTemplate: {
    DefaultEmailOption: 'CONFIRM_WITH_CODE',
  },
  UserAttributeUpdateSettings: {
    AttributesRequireVerificationBeforeUpdate: ['email'],
  },
  MfaConfiguration: 'ON',
  EstimatedNumberOfUsers: 0,
  EmailConfiguration: {
    EmailSendingAccount: 'COGNITO_DEFAULT',
  },
  UserPoolTags: {},
  Domain: 'ref-auth-userpool-1',
  AdminCreateUserConfig: {
    AllowAdminCreateUserOnly: false,
    UnusedAccountValidityDays: 7,
  },
  UsernameConfiguration: {
    CaseSensitive: false,
  },
  Arn: `arn:aws:cognito-idp:us-east-1:000000000000:userpool/${SampleInputProperties.userPoolId}`,
  AccountRecoverySetting: {
    RecoveryMechanisms: [
      {
        Priority: 1,
        Name: 'verified_email',
      },
    ],
  },
};

export const UserPoolGroups: Readonly<ListGroupsResponse> = {
  Groups: [
    {
      GroupName: 'sample-group-name',
      RoleArn: 'arn:aws:iam::000000000000:role/sample-group-role',
    },
  ],
};

/**
 * Sample data from get user pool mfa config
 */
export const MFAResponse: Readonly<
  Omit<GetUserPoolMfaConfigCommandOutput, '$metadata'>
> = {
  SoftwareTokenMfaConfiguration: {
    Enabled: true,
  },
  MfaConfiguration: 'ON',
};

/**
 * Sample data from list identity providers
 */
export const IdentityProviders: Readonly<ProviderDescription[]> = [
  {
    ProviderName: 'Facebook',
    ProviderType: 'Facebook',
  },
  {
    ProviderName: 'Google',
    ProviderType: 'Google',
  },
  {
    ProviderName: 'LoginWithAmazon',
    ProviderType: 'LoginWithAmazon',
  },
];

/**
 * Sample data for describe identity pool
 */
export const IdentityPool: Readonly<IdentityPoolType> = {
  IdentityPoolId: SampleInputProperties.identityPoolId,
  IdentityPoolName: 'sample-identity-pool-name',
  AllowUnauthenticatedIdentities: true,
  AllowClassicFlow: false,
  CognitoIdentityProviders: [
    {
      ProviderName: `cognito-idp.us-east-1.amazonaws.com/${SampleInputProperties.userPoolId}`,
      ClientId: SampleInputProperties.userPoolClientId,
      ServerSideTokenCheck: false,
    },
  ],
  IdentityPoolTags: {},
};

/**
 * Sample data for get identity pool roles
 */
export const IdentityPoolRoles = {
  IdentityPoolId: SampleInputProperties.identityPoolId,
  Roles: {
    authenticated: SampleInputProperties.authRoleArn,
    unauthenticated: SampleInputProperties.unauthRoleArn,
  },
};

/**
 * Sample data from describe user pool client
 */
export const UserPoolClient: Readonly<UserPoolClientType> = {
  UserPoolId: SampleInputProperties.userPoolId,
  ClientName: 'ref-auth-app-client-1',
  ClientId: SampleInputProperties.userPoolClientId,
  RefreshTokenValidity: 30,
  AccessTokenValidity: 60,
  IdTokenValidity: 60,
  TokenValidityUnits: {
    AccessToken: 'minutes',
    IdToken: 'minutes',
    RefreshToken: 'days',
  },
  ReadAttributes: [
    'address',
    'birthdate',
    // eslint-disable-next-line spellcheck/spell-checker
    'custom:duplicateemail',
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
    // eslint-disable-next-line spellcheck/spell-checker
    'custom:duplicateemail',
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
  ExplicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
  SupportedIdentityProviders: [
    'COGNITO',
    'Facebook',
    'Google',
    'LoginWithAmazon',
  ],
  CallbackURLs: ['https://redirect.com', 'https://redirect2.com'],
  LogoutURLs: ['https://anotherlogouturl.com', 'https://logouturl.com'],
  AllowedOAuthFlows: ['code'],
  AllowedOAuthScopes: ['email', 'openid', 'phone'],
  AllowedOAuthFlowsUserPoolClient: true,
  PreventUserExistenceErrors: 'ENABLED',
  EnableTokenRevocation: true,
  EnablePropagateAdditionalUserContextData: false,
  AuthSessionValidity: 3,
};
