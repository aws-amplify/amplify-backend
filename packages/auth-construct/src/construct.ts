import { Construct } from 'constructs';
import {
  Lazy,
  RemovalPolicy,
  Stack,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
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
  CfnUserPoolIdentityProvider,
  CustomAttributeConfig,
  ICustomAttribute,
  Mfa,
  MfaSecondFactor,
  OAuthScope,
  OidcAttributeRequestMethod,
  ProviderAttribute,
  StandardAttribute,
  UserPool,
  UserPoolClient,
  UserPoolDomain,
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
  CustomAttribute,
  EmailLoginSettings,
  ExternalProviderOptions,
} from './types.js';
import { DEFAULTS } from './defaults.js';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import * as path from 'path';

type DefaultRoles = { auth: Role; unAuth: Role };
type IdentityProviderSetupResult = {
  oAuthMappings: Record<string, string>;
  oAuthSettings: cognito.OAuthSettings | undefined;
  google?: UserPoolIdentityProviderGoogle;
  facebook?: UserPoolIdentityProviderFacebook;
  amazon?: UserPoolIdentityProviderAmazon;
  apple?: UserPoolIdentityProviderApple;
  oidc?: UserPoolIdentityProviderOidc[];
  saml?: UserPoolIdentityProviderSaml;
};
type OAuthProviderMapping = {
  facebook: string;
  google: string;
  amazon: string;
  apple: string;
};
const oauthProviderToProviderDomainMap: OAuthProviderMapping = {
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

    const cfnUserPool = this.userPool.node.findChild('Resource') as CfnUserPool;
    if (!(cfnUserPool instanceof CfnUserPool)) {
      throw Error('Could not find CfnUserPool resource in stack.');
    }
    const cfnUserPoolClient = userPoolClient.node.findChild(
      'Resource'
    ) as CfnUserPoolClient;
    if (!(cfnUserPoolClient instanceof CfnUserPoolClient)) {
      throw Error('Could not find CfnUserPoolClient resource in stack.');
    }
    // expose resources
    this.resources = {
      userPool: this.userPool,
      userPoolClient,
      authenticatedUserIamRole: auth,
      unauthenticatedUserIamRole: unAuth,
      cfnResources: {
        cfnUserPool,
        cfnUserPoolClient,
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
   * Define bindCustomAttribute to meet requirements of the Cognito API to call the bind method
   */
  private bindCustomAttribute = (
    key: string,
    attribute: CustomAttribute
  ): CustomAttributeConfig & ICustomAttribute => {
    const baseConfig: CustomAttributeConfig = {
      dataType: attribute.dataType,

      mutable: attribute.mutable ?? true,
    };

    let constraints = {};
    // Conditionally add constraint properties based on dataType.
    if (attribute.dataType === 'String') {
      constraints = {
        stringConstraints: {
          minLen: attribute.minLen,

          maxLen: attribute.maxLen,
        },
      };
    } else if (attribute.dataType === 'Number') {
      constraints = {
        numberConstraints: {
          min: attribute.min,

          max: attribute.max,
        },
      };
    }
    //The final config object includes baseConfig and conditionally added constraint properties.
    const config = {
      ...baseConfig,

      ...constraints,
    };

    return {
      ...config,

      bind: () => config,
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
    const mfaType = this.getMFAType(props.multifactor);
    const mfaMode = this.getMFAMode(props.multifactor);

    // If phone login is enabled along with MFA, cognito requires that mfa SMS type to be enabled.
    if (phoneEnabled && mfaMode && mfaMode !== 'OFF' && !mfaType?.sms) {
      throw Error(
        'Invalid MFA settings. SMS must be enabled in multiFactor if loginWith phone is enabled'
      );
    }

    const { standardAttributes, customAttributes } = Object.entries(
      props.userAttributes ?? {}
    ).reduce(
      (
        acc: {
          standardAttributes: { [key: string]: StandardAttribute };
          customAttributes: {
            [key: string]: CustomAttributeConfig & ICustomAttribute;
          };
        },
        [key, value]
      ) => {
        if (key.startsWith('custom:')) {
          const attributeKey = key.replace(/^custom:/i, '');
          acc.customAttributes[attributeKey] = this.bindCustomAttribute(
            attributeKey,
            value
          );
        } else {
          acc.standardAttributes[key] = value;
        }
        return acc;
      },
      { standardAttributes: {}, customAttributes: {} }
    );

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
        ...standardAttributes,
      },
      customAttributes: {
        ...customAttributes,
      },
      email: cognito.UserPoolEmail.withSES({
        fromEmail: props.senders?.email.fromEmail,
        fromName: props.senders?.email.fromName,
        replyTo: props.senders?.email.replyTo,
      }),

      selfSignUpEnabled: DEFAULTS.ALLOW_SELF_SIGN_UP,
      mfa: mfaMode,
      mfaMessage: this.getMFAMessage(props.multifactor),
      mfaSecondFactor: mfaType,
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
   * Convert user friendly Mfa mode to cognito Mfa Mode.
   * This eliminates the need for users to import cognito.Mfa.
   * @param mfa - MFA settings
   * @returns cognito MFA enforcement mode
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
   * Convert user friendly Mfa type to cognito Mfa type.
   * This eliminates the need for users to import cognito.Mfa.
   * @param mfa - MFA settings
   * @returns cognito MFA type (sms or totp)
   */
  private getMFAType = (
    mfa: AuthProps['multifactor']
  ): MfaSecondFactor | undefined => {
    return typeof mfa === 'object' && mfa.mode !== 'OFF'
      ? {
          sms: mfa.sms ? true : false,
          otp: mfa.totp ? true : false,
        }
      : undefined;
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
      result.oAuthMappings[oauthProviderToProviderDomainMap.google] =
        external.google.clientId;
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
      result.oAuthMappings[oauthProviderToProviderDomainMap.facebook] =
        external.facebook.clientId;
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
      result.oAuthMappings[oauthProviderToProviderDomainMap.amazon] =
        external.loginWithAmazon.clientId;
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
      result.oAuthMappings[oauthProviderToProviderDomainMap.apple] =
        external.signInWithApple.clientId;
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
    const cfnUserPool = this.resources.cfnResources.cfnUserPool;
    const cfnUserPoolClient = this.resources.cfnResources.cfnUserPoolClient;
    const cfnIdentityPool = this.resources.cfnResources.cfnIdentityPool;
    // these properties cannot be overwritten
    const output: AuthOutput['payload'] = {
      userPoolId: this.resources.userPool.userPoolId,
      webClientId: this.resources.userPoolClient.userPoolClientId,
      identityPoolId: cfnIdentityPool.ref,
      authRegion: Stack.of(this).region,
    };

    // the properties below this line can be overwritten, so they are exposed via cdk LAZY
    output.allowUnauthenticatedIdentities = Lazy.string({
      produce: () =>
        cfnIdentityPool.allowUnauthenticatedIdentities === true
          ? 'true'
          : 'false',
    });

    // extract signupAttributes from UserPool schema's required attributes
    output.signupAttributes = Lazy.string({
      produce: () => {
        if (!cfnUserPool.schema) {
          return '[]';
        }
        return JSON.stringify(
          (cfnUserPool.schema as CfnUserPool.SchemaAttributeProperty[])
            .filter((attribute) => attribute.required && attribute.name)
            .map((attribute) => attribute.name?.toLowerCase())
        );
      },
    });

    // extract usernameAttributes from UserPool's usernameAttributes
    output.usernameAttributes = Lazy.string({
      produce: () => {
        return JSON.stringify(
          cfnUserPool.usernameAttributes?.map((attr) => attr.toLowerCase()) ||
            []
        );
      },
    });

    // extract verificationMechanisms from UserPool's autoVerifiedAttributes
    output.verificationMechanisms = Lazy.string({
      produce: () => {
        return JSON.stringify(cfnUserPool.autoVerifiedAttributes ?? []);
      },
    });

    // extract the passwordPolicy from the UserPool policies
    output.passwordPolicyMinLength = Lazy.string({
      produce: () => {
        if (!cfnUserPool.policies) {
          return '';
        }
        const policy = (cfnUserPool.policies as CfnUserPool.PoliciesProperty)
          .passwordPolicy as CfnUserPool.PasswordPolicyProperty;
        return policy.minimumLength?.toString();
      },
    });

    output.passwordPolicyRequirements = Lazy.string({
      produce: () => {
        if (!cfnUserPool.policies) {
          return '';
        }
        const policy = (cfnUserPool.policies as CfnUserPool.PoliciesProperty)
          .passwordPolicy as CfnUserPool.PasswordPolicyProperty;
        const requirements = [];
        policy.requireNumbers && requirements.push('REQUIRES_NUMBERS');
        policy.requireLowercase && requirements.push('REQUIRES_LOWERCASE');
        policy.requireUppercase && requirements.push('REQUIRES_UPPERCASE');
        policy.requireSymbols && requirements.push('REQUIRES_SYMBOLS');
        return JSON.stringify(requirements);
      },
    });

    // extract the MFA configuration setting from the UserPool resource
    output.mfaConfiguration = Lazy.string({
      produce: () => {
        return cfnUserPool.mfaConfiguration ?? 'OFF';
      },
    });
    // extract the MFA types from the UserPool resource
    output.mfaTypes = Lazy.string({
      produce: () => {
        const mfaTypes: string[] = [];
        (cfnUserPool.enabledMfas ?? []).forEach((type) => {
          if (type === 'SMS_MFA') {
            mfaTypes.push('SMS');
          }
          if (type === 'SOFTWARE_TOKEN_MFA') {
            mfaTypes.push('TOTP');
          }
        });
        return JSON.stringify(mfaTypes);
      },
    });

    // extract social providers from UserPool resource
    output.socialProviders = Lazy.string({
      produce: () => {
        const outputProviders: string[] = [];
        const userPoolProviders = this.resources.userPool.identityProviders;
        if (!userPoolProviders || userPoolProviders.length === 0) {
          return '';
        }
        for (const provider of userPoolProviders) {
          const providerResource = provider.node.findChild(
            'Resource'
          ) as CfnUserPoolIdentityProvider;
          if (!(providerResource instanceof CfnUserPoolIdentityProvider)) {
            throw Error(
              'Could not find the CfnUserPoolIdentityProvider resource in the stack.'
            );
          }
          const providerType = providerResource.providerType;
          const providerName = providerResource.providerName;
          if (providerType === 'Google') {
            outputProviders.push('GOOGLE');
          }
          if (providerType === 'Facebook') {
            outputProviders.push('FACEBOOK');
          }
          if (providerType === 'SignInWithApple') {
            outputProviders.push('SIGN_IN_WITH_APPLE');
          }
          if (providerType === 'LoginWithAmazon') {
            outputProviders.push('LOGIN_WITH_AMAZON');
          }
          if (providerType === 'OIDC') {
            outputProviders.push(providerName);
          }
          if (providerType === 'SAML') {
            outputProviders.push(providerName);
          }
        }
        return JSON.stringify(outputProviders);
      },
    });

    output.oauthCognitoDomain = Lazy.string({
      produce: () => {
        const userPoolDomain = this.resources.userPool.node.tryFindChild(
          `${this.name}UserPoolDomain`
        );
        if (!userPoolDomain) {
          return '';
        }
        if (!(userPoolDomain instanceof UserPoolDomain)) {
          throw Error('Could not find UserPoolDomain resource in the stack.');
        }
        return `${userPoolDomain.domainName}.auth.${
          Stack.of(this).region
        }.amazoncognito.com`;
      },
    });

    output.oauthScope = Lazy.string({
      produce: () => {
        return JSON.stringify(cfnUserPoolClient.allowedOAuthScopes ?? []);
      },
    });

    output.oauthRedirectSignIn = Lazy.string({
      produce: () => {
        return cfnUserPoolClient.callbackUrLs
          ? cfnUserPoolClient.callbackUrLs.join(',')
          : '';
      },
    });

    output.oauthRedirectSignOut = Lazy.string({
      produce: () => {
        return cfnUserPoolClient.logoutUrLs
          ? cfnUserPoolClient.logoutUrLs.join(',')
          : '';
      },
    });

    output.oauthResponseType = Lazy.string({
      produce: () => {
        return cfnUserPoolClient.allowedOAuthFlows
          ? cfnUserPoolClient.allowedOAuthFlows.join(',')
          : '';
      },
    });

    output.oauthClientId = Lazy.string({
      produce: () => {
        return cfnUserPoolClient.ref;
      },
    });

    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}
