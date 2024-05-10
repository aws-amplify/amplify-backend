import { Construct } from 'constructs';
import { RemovalPolicy, Stack, aws_cognito as cognito } from 'aws-cdk-lib';
import {
  AuthResources,
  BackendOutputStorageStrategy,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  CfnIdentityPool,
  CfnUserPool,
  CfnUserPoolClient,
  CfnUserPoolGroup,
  Mfa,
  OAuthScope,
  OidcAttributeRequestMethod,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
  UserPoolIdentityProviderAmazon,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderOidc,
  UserPoolIdentityProviderSaml,
  UserPoolIdentityProviderSamlMetadataType,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput, authOutputKey } from '@aws-amplify/backend-output-schemas';
import {
  AttributeMapping,
  AuthProps,
  EmailLoginSettings,
  ExternalProviderOptions,
} from './types.js';
import { DEFAULTS } from './defaults.js';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import * as path from 'path';
import { coreAttributeNameMap } from './string_maps.js';

type DefaultRoles = { auth: Role; unAuth: Role };
type IdentityProviderSetupResult = {
  oAuthMappings: Record<string, string>;
  providersList: string[];
  oAuthSettings: cognito.OAuthSettings | undefined;
  google?: UserPoolIdentityProviderGoogle;
  facebook?: UserPoolIdentityProviderFacebook;
  amazon?: UserPoolIdentityProviderAmazon;
  apple?: UserPoolIdentityProviderApple;
  oidc?: UserPoolIdentityProviderOidc[];
  saml?: UserPoolIdentityProviderSaml;
};
const authProvidersList = {
  facebook: 'graph.facebook.com',
  google: 'accounts.google.com',
  amazon: 'www.amazon.com',
  apple: 'appleid.apple.com',
};
const INVITATION_PLACEHOLDERS = {
  CODE: '{####}',
  USERNAME: '{username}',
};
const VERIFICATION_EMAIL_PLACEHOLDERS = {
  CODE: '{####}',
  LINK: '{##Verify Email##}',
};
const VERIFICATION_SMS_PLACEHOLDERS = {
  CODE: '{####}',
};
const MFA_SMS_PLACEHOLDERS = {
  CODE: '{####}',
};
const DEFAULT_OAUTH_SCOPES = [
  OAuthScope.PHONE,
  OAuthScope.EMAIL,
  OAuthScope.OPENID,
  OAuthScope.PROFILE,
  OAuthScope.COGNITO_ADMIN,
];

// Be very careful editing this value. It is the string that is used to attribute stacks to Amplify Auth in BI metrics
const authStackType = 'auth-Cognito';

/**
 * Amplify Auth CDK Construct
 */
export class AmplifyAuth
  extends Construct
  implements ResourceProvider<AuthResources>
{
  /**
   * The resources generated by the construct.
   */
  readonly resources: AuthResources;
  /**
   * External provider settings
   */
  private readonly providerSetupResult: IdentityProviderSetupResult;

  private readonly userPool: UserPool;

  private readonly computedUserPoolProps: UserPoolProps;

  private readonly name: string;

  private readonly domainPrefix: string | undefined;

  private readonly groups: {
    [key: string]: {
      cfnUserGroup: CfnUserPoolGroup;
      role: Role;
    };
  } = {};

  /**
   * Create a new Auth construct with AuthProps.
   * If no props are provided, email login and defaults will be used.
   */
  constructor(
    scope: Construct,
    id: string,
    props: AuthProps = DEFAULTS.IF_NO_PROPS_PROVIDED
  ) {
    super(scope, id);

    this.name = props.name ?? '';
    this.domainPrefix = props.loginWith.externalProviders?.domainPrefix;

    // UserPool
    this.computedUserPoolProps = this.getUserPoolProps(props);
    this.userPool = new cognito.UserPool(
      this,
      `${this.name}UserPool`,
      this.computedUserPoolProps
    );

    // UserPool - External Providers (Oauth, SAML, OIDC) and User Pool Domain
    this.providerSetupResult = this.setupExternalProviders(
      this.userPool,
      props.loginWith
    );

    // UserPool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      `${this.name}UserPoolAppClient`,
      {
        userPool: this.userPool,
        authFlows: DEFAULTS.AUTH_FLOWS,
        preventUserExistenceErrors: DEFAULTS.PREVENT_USER_EXISTENCE_ERRORS,
        oAuth: this.providerSetupResult.oAuthSettings,
      }
    );

    // Identity Pool
    const {
      identityPool,
      identityPoolRoleAttachment,
      roles: { auth, unAuth },
    } = this.setupIdentityPool(
      this.userPool,
      userPoolClient,
      this.providerSetupResult
    );

    // Setup UserPool groups
    this.setupUserPoolGroups(props.groups, identityPool);

    // expose resources
    this.resources = {
      userPool: this.userPool,
      userPoolClient,
      authenticatedUserIamRole: auth,
      unauthenticatedUserIamRole: unAuth,
      cfnResources: {
        cfnUserPool: this.userPool.node.findChild('Resource') as CfnUserPool,
        cfnUserPoolClient: userPoolClient.node.findChild(
          'Resource'
        ) as CfnUserPoolClient,
        cfnIdentityPool: identityPool,
        cfnIdentityPoolRoleAttachment: identityPoolRoleAttachment,
      },
      groups: this.groups,
    };
    this.storeOutput(props.outputStorageStrategy);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      authStackType,
      path.resolve(__dirname, '..', 'package.json')
    );
  }

  /**
   * Create Auth/UnAuth Roles
   * @returns DefaultRoles
   */
  private setupAuthAndUnAuthRoles = (identityPoolId: string): DefaultRoles => {
    const result: DefaultRoles = {
      auth: new Role(this, `${this.name}authenticatedUserRole`, {
        assumedBy: new FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        ),
      }),
      unAuth: new Role(this, `${this.name}unauthenticatedUserRole`, {
        assumedBy: new FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPoolId,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'unauthenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        ),
      }),
    };
    return result;
  };

  /**
   * Auto generate the user pool groups and group roles
   */
  private setupUserPoolGroups = (
    groups: string[] | undefined,
    identityPool: CfnIdentityPool
  ) => {
    (groups || []).forEach((groupName, index) => {
      const groupRole = new Role(this, `${this.name}${groupName}GroupRole`, {
        assumedBy: new FederatedPrincipal(
          'cognito-identity.amazonaws.com',
          {
            StringEquals: {
              'cognito-identity.amazonaws.com:aud': identityPool.ref,
            },
            'ForAnyValue:StringLike': {
              'cognito-identity.amazonaws.com:amr': 'authenticated',
            },
          },
          'sts:AssumeRoleWithWebIdentity'
        ),
      });
      const currentGroup = new CfnUserPoolGroup(
        this,
        `${this.name}${groupName}Group`,
        {
          userPoolId: this.userPool.userPoolId,
          groupName: groupName,
          roleArn: groupRole.roleArn,
          precedence: index,
        }
      );
      this.groups[groupName] = {
        cfnUserGroup: currentGroup,
        role: groupRole,
      };
    });
  };

  /**
   * Setup Identity Pool with default roles/role mappings, and register providers
   */
  private setupIdentityPool = (
    userPool: UserPool,
    userPoolClient: UserPoolClient,
    providerSetupResult: IdentityProviderSetupResult
  ) => {
    // setup identity pool
    const region = Stack.of(this).region;
    const identityPool = new cognito.CfnIdentityPool(
      this,
      `${this.name}IdentityPool`,
      {
        allowUnauthenticatedIdentities:
          DEFAULTS.ALLOW_UNAUTHENTICATED_IDENTITIES,
      }
    );
    const roles = this.setupAuthAndUnAuthRoles(identityPool.ref);
    const identityPoolRoleAttachment =
      new cognito.CfnIdentityPoolRoleAttachment(
        this,
        `${this.name}IdentityPoolRoleAttachment`,
        {
          identityPoolId: identityPool.ref,
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
        providerName: `cognito-idp.${region}.amazonaws.com/${userPool.userPoolId}`,
      },
    ];
    // add other providers
    identityPool.supportedLoginProviders = providerSetupResult.oAuthMappings;
    return {
      identityPool,
      identityPoolRoleAttachment,
      roles,
    };
  };

  /**
   * Process props into UserPoolProps (set defaults if needed)
   */
  private getUserPoolProps = (props: AuthProps): UserPoolProps => {
    const emailEnabled = props.loginWith.email ? true : false;
    const phoneEnabled = props.loginWith.phone ? true : false;
    const oneOfEmailOrPhone = emailEnabled || phoneEnabled;
    if (!oneOfEmailOrPhone) {
      throw Error('At least one of email or phone must be enabled.');
    }
    let userVerificationSettings: cognito.UserVerificationConfig = {};
    // extract email settings if settings object is defined
    if (typeof props.loginWith.email === 'object') {
      const emailSettings = props.loginWith.email;
      // verify email body and inject the actual template values which cognito uses
      const emailBody: string | undefined = this.verifyEmailBody(emailSettings);
      userVerificationSettings = {
        emailBody: emailBody,
        emailStyle: this.getEmailVerificationStyle(
          emailSettings.verificationEmailStyle
        ),
        emailSubject: emailSettings.verificationEmailSubject,
      };
    }
    // extract phone settings if settings object is defined
    if (typeof props.loginWith.phone === 'object') {
      const phoneSettings = props.loginWith.phone;
      let smsMessage: string | undefined;
      if (
        phoneSettings.verificationMessage &&
        typeof phoneSettings.verificationMessage === 'function'
      ) {
        // validate sms message structure
        smsMessage = phoneSettings.verificationMessage(
          () => VERIFICATION_SMS_PLACEHOLDERS.CODE
        );
        if (!smsMessage.includes(VERIFICATION_SMS_PLACEHOLDERS.CODE)) {
          throw Error(
            "Invalid phone settings. Property 'verificationMessage' must utilize the 'code' parameter at least once as a placeholder for the verification code."
          );
        }
      }
      userVerificationSettings = {
        ...userVerificationSettings,
        smsMessage: smsMessage,
      };
    }
    const userPoolProps: UserPoolProps = {
      signInCaseSensitive: DEFAULTS.SIGN_IN_CASE_SENSITIVE,
      signInAliases: {
        phone: phoneEnabled,
        email: emailEnabled,
      },
      keepOriginal: {
        email: emailEnabled,
        phone: phoneEnabled,
      },
      autoVerify: {
        email: emailEnabled,
        phone: phoneEnabled,
      },
      userVerification: userVerificationSettings,
      passwordPolicy: DEFAULTS.PASSWORD_POLICY,
      standardAttributes: {
        email: DEFAULTS.IS_REQUIRED_ATTRIBUTE.email(emailEnabled),
        phoneNumber: DEFAULTS.IS_REQUIRED_ATTRIBUTE.phoneNumber(phoneEnabled),
        ...(props.userAttributes ? props.userAttributes : {}),
      },
      selfSignUpEnabled: DEFAULTS.ALLOW_SELF_SIGN_UP,
      mfa: this.getMFAMode(props.multifactor),
      mfaMessage: this.getMFAMessage(props.multifactor),
      mfaSecondFactor:
        typeof props.multifactor === 'object' &&
        props.multifactor.mode !== 'OFF'
          ? {
              sms: props.multifactor.sms ? true : false,
              otp: props.multifactor.totp ? true : false,
            }
          : undefined,
      accountRecovery: this.getAccountRecoverySetting(
        emailEnabled,
        phoneEnabled,
        props.accountRecovery
      ),
      removalPolicy: RemovalPolicy.DESTROY,
      userInvitation:
        typeof props.loginWith.email !== 'boolean'
          ? this.getUserInvitationSettings(
              props.loginWith.email?.userInvitation
            )
          : undefined,
    };
    return userPoolProps;
  };

  /**
   * Parses the user invitation settings and inserts codes/usernames where necessary.
   * @param settings the invitation settings
   * @returns cognito.UserInvitationConfig | undefined
   */
  private getUserInvitationSettings(
    settings: EmailLoginSettings['userInvitation']
  ): cognito.UserInvitationConfig | undefined {
    if (!settings) {
      return undefined;
    }
    return {
      emailSubject: settings.emailSubject,
      emailBody: settings.emailBody
        ? settings.emailBody(
            () => INVITATION_PLACEHOLDERS.USERNAME,
            () => INVITATION_PLACEHOLDERS.CODE
          )
        : undefined,
      smsMessage: settings.smsMessage
        ? settings.smsMessage(
            () => INVITATION_PLACEHOLDERS.USERNAME,
            () => INVITATION_PLACEHOLDERS.CODE
          )
        : undefined,
    };
  }

  /**
   * Verify the email body depending on if 'CODE' or 'LINK' style is used.
   * This ensures that the template contains the necessary placeholders for Cognito to insert verification codes or links.
   * @param emailSettings the provided email settings
   * @returns emailBody
   */
  private verifyEmailBody(
    emailSettings: EmailLoginSettings
  ): string | undefined {
    let emailBody: string | undefined;
    if (
      emailSettings.verificationEmailBody &&
      emailSettings.verificationEmailStyle !== 'LINK'
    ) {
      emailBody = emailSettings.verificationEmailBody(
        () => VERIFICATION_EMAIL_PLACEHOLDERS.CODE
      );
      if (!emailBody.includes(VERIFICATION_EMAIL_PLACEHOLDERS.CODE)) {
        throw Error(
          "Invalid email settings. Property 'verificationEmailBody' must utilize the 'code' parameter at least once as a placeholder for the verification code."
        );
      }
    }
    if (
      emailSettings.verificationEmailBody &&
      emailSettings.verificationEmailStyle === 'LINK'
    ) {
      let linkText: string = '';
      emailBody = emailSettings.verificationEmailBody((text?: string) => {
        linkText = text
          ? `{##${text}##}`
          : VERIFICATION_EMAIL_PLACEHOLDERS.LINK;
        return linkText;
      });
      if (linkText === '' || !emailBody.includes(linkText)) {
        throw Error(
          "Invalid email settings. Property 'verificationEmailBody' must utilize the 'link' parameter at least once as a placeholder for the verification link."
        );
      }
    }
    return emailBody;
  }

  /**
   * Get email verification style from user props
   * @param verificationEmailStyle - string value
   * @returns verificationEmailStyle - enum value
   */
  private getEmailVerificationStyle = (
    verificationEmailStyle: 'CODE' | 'LINK' | undefined
  ): cognito.VerificationEmailStyle | undefined => {
    if (verificationEmailStyle === 'CODE') {
      return cognito.VerificationEmailStyle.CODE;
    } else if (verificationEmailStyle === 'LINK') {
      return cognito.VerificationEmailStyle.LINK;
    }
    return undefined;
  };

  /**
   * Determine the account recovery option based on enabled login methods.
   * @param emailEnabled - is email enabled
   * @param phoneEnabled - is phone enabled
   * @param accountRecoveryMethodAsString - the user provided account recovery setting
   * @returns account recovery setting enum value
   */
  private getAccountRecoverySetting = (
    emailEnabled: boolean,
    phoneEnabled: boolean,
    accountRecoveryMethodAsString: AuthProps['accountRecovery']
  ): cognito.AccountRecovery | undefined => {
    const accountRecovery = this.convertAccountRecoveryStringToEnum(
      accountRecoveryMethodAsString
    );
    if (accountRecovery !== undefined) {
      return accountRecovery;
    }
    // set default based on enabled login methods
    if (phoneEnabled && emailEnabled) {
      return cognito.AccountRecovery.EMAIL_ONLY;
    }
    if (phoneEnabled) {
      return cognito.AccountRecovery.PHONE_ONLY_WITHOUT_MFA;
    }
    if (emailEnabled) {
      return cognito.AccountRecovery.EMAIL_ONLY;
    }
    return undefined;
  };

  /**
   * Convert user friendly Mfa mode to cognito Mfa type.
   * This eliminates the need for users to import cognito.Mfa.
   * @param mfa - MFA settings
   * @returns cognito MFA enforcement type
   */
  private getMFAMode = (mfa: AuthProps['multifactor']): Mfa | undefined => {
    if (mfa) {
      switch (mfa.mode) {
        case 'OFF':
          return Mfa.OFF;
        case 'OPTIONAL':
          return Mfa.OPTIONAL;
        case 'REQUIRED':
          return Mfa.REQUIRED;
      }
    }
    return undefined;
  };

  /**
   * Convert user friendly account recovery method to cognito AccountRecover enum.
   * This eliminates the need for users to import cognito.AccountRecovery.
   * @param method - account recovery method as a string value
   * @returns cognito.AccountRecovery enum value
   */
  private convertAccountRecoveryStringToEnum = (
    method: AuthProps['accountRecovery']
  ): cognito.AccountRecovery | undefined => {
    if (method !== undefined) {
      return cognito.AccountRecovery[method];
    }
    return undefined;
  };

  /**
   * Extract the MFA message settings and perform validation.
   * @param mfa - MFA settings
   * @returns mfa message
   */
  private getMFAMessage = (
    mfa: AuthProps['multifactor']
  ): string | undefined => {
    if (mfa && mfa.mode !== 'OFF' && typeof mfa.sms === 'object') {
      const message = mfa.sms.smsMessage(() => MFA_SMS_PLACEHOLDERS.CODE);
      if (!message.includes(MFA_SMS_PLACEHOLDERS.CODE)) {
        throw Error(
          "Invalid MFA settings. Property 'smsMessage' must utilize the 'code' parameter at least once as a placeholder for the verification code."
        );
      }
      return message;
    }
    return undefined;
  };

  /**
   * Setup External Providers (OAuth/OIDC/SAML) and related settings
   * such as OAuth settings and User Pool Domains
   */
  private setupExternalProviders = (
    userPool: UserPool,
    loginOptions: AuthProps['loginWith']
  ): IdentityProviderSetupResult => {
    /**
     * If email is enabled, and is the only required attribute, we are able to
     * automatically map the email attribute from external providers, excluding SAML.
     */
    const shouldMapEmailAttributes = loginOptions.email && !loginOptions.phone;
    const result: IdentityProviderSetupResult = {
      oAuthMappings: {},
      providersList: [],
      oAuthSettings: {
        flows: DEFAULTS.OAUTH_FLOWS,
      },
    };
    // external providers
    const external = loginOptions.externalProviders;
    if (!external) {
      return result;
    }
    // make sure logout/callback urls are not empty
    if (external.logoutUrls && external.logoutUrls.length === 0) {
      throw Error(
        'You must define logoutUrls when configuring external login providers.'
      );
    }
    if (external.callbackUrls && external.callbackUrls.length === 0) {
      throw Error(
        'You must define callbackUrls when configuring external login providers.'
      );
    }
    if (external.google) {
      const googleProps = external.google;
      result.google = new cognito.UserPoolIdentityProviderGoogle(
        this,
        `${this.name}GoogleIdP`,
        {
          userPool,
          clientId: googleProps.clientId,
          clientSecretValue: googleProps.clientSecret,
          attributeMapping: {
            ...(shouldMapEmailAttributes
              ? {
                  email: ProviderAttribute.GOOGLE_EMAIL,
                }
              : undefined),
            ...this.convertToCognitoAttributeMapping(
              googleProps.attributeMapping
            ),
          },
          scopes: googleProps.scopes,
        }
      );
      result.oAuthMappings[authProvidersList.google] = external.google.clientId;
      result.providersList.push('GOOGLE');
    }
    if (external.facebook) {
      result.facebook = new cognito.UserPoolIdentityProviderFacebook(
        this,
        `${this.name}FacebookIDP`,
        {
          userPool,
          ...external.facebook,
          attributeMapping: {
            ...(shouldMapEmailAttributes
              ? {
                  email: ProviderAttribute.FACEBOOK_EMAIL,
                }
              : undefined),
            ...this.convertToCognitoAttributeMapping(
              external.facebook.attributeMapping
            ),
          },
        }
      );
      result.oAuthMappings[authProvidersList.facebook] =
        external.facebook.clientId;
      result.providersList.push('FACEBOOK');
    }
    if (external.loginWithAmazon) {
      result.amazon = new cognito.UserPoolIdentityProviderAmazon(
        this,
        `${this.name}AmazonIDP`,
        {
          userPool,
          ...external.loginWithAmazon,
          attributeMapping: {
            ...(shouldMapEmailAttributes
              ? {
                  email: ProviderAttribute.AMAZON_EMAIL,
                }
              : undefined),
            ...this.convertToCognitoAttributeMapping(
              external.loginWithAmazon.attributeMapping
            ),
          },
        }
      );
      result.oAuthMappings[authProvidersList.amazon] =
        external.loginWithAmazon.clientId;
      result.providersList.push('AMAZON');
    }
    if (external.signInWithApple) {
      result.apple = new cognito.UserPoolIdentityProviderApple(
        this,
        `${this.name}AppleIDP`,
        {
          userPool,
          ...external.signInWithApple,
          attributeMapping: {
            ...(shouldMapEmailAttributes
              ? {
                  email: ProviderAttribute.APPLE_EMAIL,
                }
              : undefined),
            ...this.convertToCognitoAttributeMapping(
              external.signInWithApple.attributeMapping
            ),
          },
        }
      );
      result.oAuthMappings[authProvidersList.apple] =
        external.signInWithApple.clientId;
      result.providersList.push('APPLE');
    }
    if (external.oidc && external.oidc.length > 0) {
      result.oidc = [];
      external.oidc.forEach((provider, index) => {
        const requestMethod =
          provider.attributeRequestMethod === undefined
            ? 'GET' // default if not defined
            : provider.attributeRequestMethod;
        const generatedProvider = new cognito.UserPoolIdentityProviderOidc(
          this,
          `${this.name}${provider.name ?? index}OidcIDP`,
          {
            userPool,
            attributeRequestMethod:
              requestMethod === 'GET'
                ? OidcAttributeRequestMethod.GET
                : OidcAttributeRequestMethod.POST,
            clientId: provider.clientId,
            clientSecret: provider.clientSecret,
            endpoints: provider.endpoints,
            identifiers: provider.identifiers,
            issuerUrl: provider.issuerUrl,
            name: provider.name,
            scopes: provider.scopes,
            attributeMapping: {
              ...(shouldMapEmailAttributes
                ? {
                    email: {
                      attributeName: 'email',
                    },
                  }
                : undefined),
              ...this.convertToCognitoAttributeMapping(
                provider.attributeMapping
              ),
            },
          }
        );
        result.oidc?.push(generatedProvider);
        result.providersList.push(generatedProvider.providerName);
      });
    }
    if (external.saml) {
      const saml = external.saml;
      result.saml = new cognito.UserPoolIdentityProviderSaml(
        this,
        `${this.name}SamlIDP`,
        {
          userPool,
          attributeMapping: this.convertToCognitoAttributeMapping(
            saml.attributeMapping
          ),
          identifiers: saml.identifiers,
          idpSignout: saml.idpSignout,
          metadata: {
            metadataContent: saml.metadata.metadataContent,
            metadataType:
              saml.metadata.metadataType === 'FILE'
                ? UserPoolIdentityProviderSamlMetadataType.FILE
                : UserPoolIdentityProviderSamlMetadataType.URL,
          },
          name: saml.name,
        }
      );
      result.providersList.push('SAML');
    }

    // Always generate a domain prefix if external provider is configured
    if (this.domainPrefix) {
      this.userPool.addDomain(`${this.name}UserPoolDomain`, {
        cognitoDomain: { domainPrefix: this.domainPrefix },
      });
    } else {
      throw new Error(
        'Cognito Domain Prefix is missing when external providers are configured.'
      );
    }

    // oauth settings for the UserPool client
    result.oAuthSettings = {
      callbackUrls: external.callbackUrls,
      logoutUrls: external.logoutUrls,
      scopes: external.scopes
        ? this.getOAuthScopes(external.scopes)
        : DEFAULT_OAUTH_SCOPES,
      flows: DEFAULTS.OAUTH_FLOWS,
    };

    return result;
  };

  /**
   * Converts the simplified mapping type to cognito.AttributeMapping.
   * @param mapping the AttributeMapping to convert to a cognito.AttributeMapping
   * @returns cognito.AttributeMapping
   */
  private convertToCognitoAttributeMapping = (
    mapping?: AttributeMapping
  ): cognito.AttributeMapping | undefined => {
    if (!mapping) {
      return undefined;
    }
    const result: Record<
      string,
      | ProviderAttribute
      | {
          [key: string]: ProviderAttribute;
        }
    > = {};
    for (const [attrName, value] of Object.entries(mapping)) {
      if (typeof value === 'string') {
        result[attrName] = {
          attributeName: value,
        };
      }
      if (typeof value === 'object' && attrName === 'custom') {
        // dealing with custom attributes
        const customAttributes: Record<string, ProviderAttribute> = {};
        for (const [customKey, attrName] of Object.entries(value)) {
          customAttributes[customKey] = {
            attributeName: attrName,
          };
        }
        result[attrName] = customAttributes;
      }
    }
    return result;
  };
  /**
   * Convert scopes from string list to OAuthScopes.
   * @param scopes - scope list
   * @returns cognito OAuthScopes
   */
  private getOAuthScopes = (
    scopes: ExternalProviderOptions['scopes']
  ): cognito.OAuthScope[] => {
    if (scopes === undefined) {
      return [];
    }
    const result: cognito.OAuthScope[] = [];
    for (const scope of scopes) {
      result.push(cognito.OAuthScope[scope]);
    }
    return result;
  };

  /**
   * Stores auth output using the provided strategy
   */
  private storeOutput = (
    outputStorageStrategy: BackendOutputStorageStrategy<AuthOutput> = new StackMetadataBackendOutputStorageStrategy(
      Stack.of(this)
    )
  ): void => {
    const output: AuthOutput['payload'] = {
      userPoolId: this.resources.userPool.userPoolId,
      webClientId: this.resources.userPoolClient.userPoolClientId,
      identityPoolId: this.resources.cfnResources.cfnIdentityPool.ref,
      authRegion: Stack.of(this).region,
      allowUnauthenticatedIdentities:
        this.resources.cfnResources.cfnIdentityPool
          .allowUnauthenticatedIdentities === true
          ? 'true'
          : 'false',
    };
    if (this.computedUserPoolProps.standardAttributes) {
      const signupAttributes = Object.entries(
        this.computedUserPoolProps.standardAttributes
      ).reduce((acc: string[], [attributeName, attribute]) => {
        if (attribute?.required) {
          const treatedAttributeName = coreAttributeNameMap.find(
            ({ standardAttributeName }) =>
              standardAttributeName === attributeName
          );

          if (treatedAttributeName) {
            return [
              ...acc,
              treatedAttributeName.userpoolAttributeName.toLowerCase(),
            ];
          }
        }
        return acc;
      }, []);
      output.signupAttributes = JSON.stringify(signupAttributes);
    }

    if (this.computedUserPoolProps.signInAliases) {
      const usernameAttributes = [];
      if (this.computedUserPoolProps.signInAliases.email) {
        usernameAttributes.push('email');
      }
      if (this.computedUserPoolProps.signInAliases.phone) {
        usernameAttributes.push('phone_number');
      }
      if (
        this.computedUserPoolProps.signInAliases.preferredUsername ||
        this.computedUserPoolProps.signInAliases.username
      ) {
        usernameAttributes.push('preferred_username');
      }
      if (usernameAttributes.length > 0) {
        output.usernameAttributes = JSON.stringify(usernameAttributes);
      }
    }

    if (this.computedUserPoolProps.autoVerify) {
      const verificationMechanisms = [];
      if (this.computedUserPoolProps.autoVerify.email) {
        verificationMechanisms.push('email');
      }
      if (this.computedUserPoolProps.autoVerify.phone) {
        verificationMechanisms.push('phone_number');
      }
      if (verificationMechanisms.length > 0) {
        output.verificationMechanisms = JSON.stringify(verificationMechanisms);
      }
    }

    if (this.computedUserPoolProps.passwordPolicy) {
      output.passwordPolicyMinLength =
        this.computedUserPoolProps.passwordPolicy.minLength?.toString();

      const requirements = [];
      if (this.computedUserPoolProps.passwordPolicy.requireDigits) {
        requirements.push('REQUIRES_NUMBERS');
      }
      if (this.computedUserPoolProps.passwordPolicy.requireLowercase) {
        requirements.push('REQUIRES_LOWERCASE');
      }
      if (this.computedUserPoolProps.passwordPolicy.requireUppercase) {
        requirements.push('REQUIRES_UPPERCASE');
      }
      if (this.computedUserPoolProps.passwordPolicy.requireSymbols) {
        requirements.push('REQUIRES_SYMBOLS');
      }

      if (requirements.length > 0) {
        output.passwordPolicyRequirements = JSON.stringify(requirements);
      }
    }

    if (this.computedUserPoolProps.mfa) {
      output.mfaConfiguration = this.computedUserPoolProps.mfa;

      const mfaTypes = [];
      if (this.computedUserPoolProps.mfaSecondFactor?.otp) {
        mfaTypes.push('TOTP');
      }
      if (this.computedUserPoolProps.mfaSecondFactor?.sms) {
        mfaTypes.push('SMS');
      }
      if (mfaTypes.length > 0) {
        output.mfaTypes = JSON.stringify(mfaTypes);
      }
    }

    if (this.providerSetupResult.providersList.length > 0) {
      output.socialProviders = JSON.stringify(
        this.providerSetupResult.providersList
      );
    }
    // if callback URLs are configured, we must expose the oauth settings to the output
    if (
      this.providerSetupResult.oAuthSettings &&
      this.providerSetupResult.oAuthSettings.callbackUrls
    ) {
      const oAuthSettings = this.providerSetupResult.oAuthSettings;
      if (this.domainPrefix) {
        output.oauthCognitoDomain = `${this.domainPrefix}.auth.${
          Stack.of(this).region
        }.amazoncognito.com`;
      }

      output.oauthScope = JSON.stringify(
        oAuthSettings.scopes?.map((s) => s.scopeName) ?? []
      );
      output.oauthRedirectSignIn = oAuthSettings.callbackUrls
        ? oAuthSettings.callbackUrls.join(',')
        : '';
      output.oauthRedirectSignOut = oAuthSettings.logoutUrls
        ? oAuthSettings.logoutUrls.join(',')
        : '';
      output.oauthClientId = this.resources.userPoolClient.userPoolClientId;
      output.oauthResponseType = 'code';
    }

    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}
