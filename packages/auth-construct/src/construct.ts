import { Construct } from 'constructs';
import { RemovalPolicy, Stack, aws_cognito as cognito } from 'aws-cdk-lib';
import {
  AmplifyFunction,
  AuthResources,
  BackendOutputStorageStrategy,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  CfnUserPool,
  CfnUserPoolClient,
  Mfa,
  OAuthScope,
  UserPool,
  UserPoolClient,
  UserPoolIdentityProviderAmazon,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderOidc,
  UserPoolIdentityProviderSaml,
  UserPoolIdentityProviderSamlMetadataType,
  UserPoolOperation,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput, authOutputKey } from '@aws-amplify/backend-output-schemas';
import {
  AuthProps,
  EmailLoginSettings,
  ExternalProviderOptions,
  TriggerEvent,
} from './types.js';
import { DEFAULTS } from './defaults.js';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import * as path from 'path';
import { coreAttributeNameMap } from './string_maps.js';
import { build as arnBuilder } from '@aws-sdk/util-arn-parser';

type DefaultRoles = { auth: Role; unAuth: Role };
type IdentityProviderSetupResult = {
  oauthMappings: Record<string, string>;
  providersList: string[];
  google?: UserPoolIdentityProviderGoogle;
  facebook?: UserPoolIdentityProviderFacebook;
  amazon?: UserPoolIdentityProviderAmazon;
  apple?: UserPoolIdentityProviderApple;
  oidc?: UserPoolIdentityProviderOidc;
  saml?: UserPoolIdentityProviderSaml;
};
const authProvidersList = {
  facebook: 'graph.facebook.com',
  google: 'accounts.google.com',
  amazon: 'www.amazon.com',
  apple: 'appleid.apple.com',
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

  private readonly domainPrefix: string | undefined;

  private readonly oAuthSettings: cognito.OAuthSettings | undefined;

  private readonly name: string;

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

    // UserPool
    this.computedUserPoolProps = this.getUserPoolProps(props);
    this.userPool = new cognito.UserPool(
      this,
      `${this.name}UserPool`,
      this.computedUserPoolProps
    );

    // UserPool - Identity Providers
    this.providerSetupResult = this.setupIdentityProviders(
      this.userPool,
      props.loginWith
    );

    this.domainPrefix = props.loginWith.externalProviders?.domainPrefix;
    if (
      this.domainPrefix &&
      this.providerSetupResult.providersList.length > 0
    ) {
      this.userPool.addDomain(`${this.name}UserPoolDomain`, {
        cognitoDomain: { domainPrefix: this.domainPrefix },
      });
    } else if (
      this.domainPrefix &&
      this.providerSetupResult.providersList.length === 0
    ) {
      throw new Error(
        'You cannot configure a domain prefix if there are no external providers configured.'
      );
    }

    // if oauth is enabled, prepare the oauth settings for the UserPool client
    const oauthEnabled = this.providerSetupResult.providersList.length > 0;
    const externalProviders = props.loginWith.externalProviders;
    if (oauthEnabled && externalProviders) {
      // make sure logout/callback urls are not empty
      if (externalProviders.logoutUrls.length === 0) {
        throw Error(
          'You must define logoutUrls when configuring external login providers.'
        );
      }
      if (externalProviders.callbackUrls.length === 0) {
        throw Error(
          'You must define callbackUrls when configuring external login providers.'
        );
      }
      this.oAuthSettings = {
        callbackUrls: externalProviders.callbackUrls,
        logoutUrls: externalProviders.logoutUrls,
        scopes: externalProviders.scopes
          ? this.getOAuthScopes(externalProviders.scopes)
          : DEFAULT_OAUTH_SCOPES,
        flows: {
          authorizationCodeGrant: true,
        },
      };
    }
    // UserPool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      `${this.name}UserPoolAppClient`,
      {
        userPool: this.userPool,
        authFlows: DEFAULTS.AUTH_FLOWS,
        preventUserExistenceErrors: DEFAULTS.PREVENT_USER_EXISTENCE_ERRORS,
        oAuth: this.oAuthSettings,
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
    };
    this.storeOutput(props.outputStorageStrategy);

    new AttributionMetadataStorage().storeAttributionMetadata(
      Stack.of(this),
      authStackType,
      path.resolve(__dirname, '..', 'package.json')
    );
  }

  /**
   * Attach a Lambda function trigger handler to the UserPool in this construct
   * @param event - The trigger event operation
   * @param handler - The function that will handle the event
   */
  addTrigger = (
    event: TriggerEvent,
    handler: IFunction | AmplifyFunction
  ): void => {
    if ('resources' in handler) {
      this.userPool.addTrigger(
        UserPoolOperation.of(event),
        handler.resources.lambda
      );
    } else {
      // handler is an IFunction
      this.userPool.addTrigger(UserPoolOperation.of(event), handler);
    }
  };

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
    identityPool.supportedLoginProviders = providerSetupResult.oauthMappings;
    if (providerSetupResult.oidc) {
      identityPool.openIdConnectProviderArns = [
        arnBuilder({
          service: 'iam',
          region,
          accountId: Stack.of(this).account,
          resource: `oidc-provider/cognito-idp.${region}.amazonaws.com/${providerSetupResult.oidc.providerName}`,
        }),
      ];
    }
    if (providerSetupResult.saml) {
      identityPool.samlProviderArns = [
        arnBuilder({
          service: 'iam',
          region,
          accountId: Stack.of(this).account,
          resource: `saml-provider/${providerSetupResult.saml.providerName}`,
        }),
      ];
    }
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
          VERIFICATION_SMS_PLACEHOLDERS.CODE
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
    };
    return userPoolProps;
  };

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
        VERIFICATION_EMAIL_PLACEHOLDERS.CODE
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
      emailBody = emailSettings.verificationEmailBody(
        VERIFICATION_EMAIL_PLACEHOLDERS.LINK
      );
      if (!emailBody.includes(VERIFICATION_EMAIL_PLACEHOLDERS.LINK)) {
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
      const message = mfa.sms.smsMessage(MFA_SMS_PLACEHOLDERS.CODE);
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
   * Setup Identity Providers (OAuth/OIDC/SAML)
   */
  private setupIdentityProviders = (
    userPool: UserPool,
    loginOptions: AuthProps['loginWith']
  ): IdentityProviderSetupResult => {
    /**
     * If email is enabled, and is the only required attribute, we are able to
     * automatically map the email attribute from external providers, excluding SAML.
     */
    const shouldMapEmailAttributes = loginOptions.email && !loginOptions.phone;
    const result: IdentityProviderSetupResult = {
      oauthMappings: {},
      providersList: [],
    };
    // external providers
    const external = loginOptions.externalProviders;
    if (!external) {
      return result;
    }
    if (external.google) {
      const googleProps = external.google;
      const attributeMapping = {
        ...googleProps.attributeMapping,
        ...(shouldMapEmailAttributes
          ? googleProps.attributeMapping?.email || {
              email: { attributeName: 'email' },
            }
          : googleProps.attributeMapping?.email),
      };
      result.google = new cognito.UserPoolIdentityProviderGoogle(
        this,
        `${this.name}GoogleIdP`,
        {
          userPool,
          clientId: googleProps.clientId,
          clientSecretValue: googleProps.clientSecret,
          attributeMapping,
          scopes: googleProps.scopes,
        }
      );
      result.oauthMappings[authProvidersList.google] = external.google.clientId;
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
            ...external.facebook.attributeMapping,
            ...(shouldMapEmailAttributes
              ? external.facebook.attributeMapping?.email || {
                  email: { attributeName: 'email' },
                }
              : external.facebook.attributeMapping?.email),
          },
        }
      );
      result.oauthMappings[authProvidersList.facebook] =
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
            ...external.loginWithAmazon.attributeMapping,
            ...(shouldMapEmailAttributes
              ? external.loginWithAmazon.attributeMapping?.email || {
                  email: { attributeName: 'email' },
                }
              : external.loginWithAmazon.attributeMapping?.email),
          },
        }
      );
      result.oauthMappings[authProvidersList.amazon] =
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
            ...external.signInWithApple.attributeMapping,
            ...(shouldMapEmailAttributes
              ? external.signInWithApple.attributeMapping?.email || {
                  email: { attributeName: 'email' },
                }
              : external.signInWithApple.attributeMapping?.email),
          },
        }
      );
      result.oauthMappings[authProvidersList.apple] =
        external.signInWithApple.clientId;
      result.providersList.push('APPLE');
    }
    if (external.oidc) {
      result.oidc = new cognito.UserPoolIdentityProviderOidc(
        this,
        `${this.name}OidcIDP`,
        {
          userPool,
          ...external.oidc,
          attributeMapping: {
            ...external.oidc.attributeMapping,
            ...(shouldMapEmailAttributes
              ? external.oidc.attributeMapping?.email || {
                  email: { attributeName: 'email' },
                }
              : external.oidc.attributeMapping?.email),
          },
        }
      );
      result.providersList.push('OIDC');
    }
    if (external.saml) {
      const saml = external.saml;
      result.saml = new cognito.UserPoolIdentityProviderSaml(
        this,
        `${this.name}SamlIDP`,
        {
          userPool,
          attributeMapping: saml.attributeMapping,
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
              treatedAttributeName.userpoolAttributeName.toUpperCase(),
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
        usernameAttributes.push('EMAIL');
      }
      if (this.computedUserPoolProps.signInAliases.phone) {
        usernameAttributes.push('PHONE_NUMBER');
      }
      if (
        this.computedUserPoolProps.signInAliases.preferredUsername ||
        this.computedUserPoolProps.signInAliases.username
      ) {
        usernameAttributes.push('PREFERRED_USERNAME');
      }
      if (usernameAttributes.length > 0) {
        output.usernameAttributes = JSON.stringify(usernameAttributes);
      }
    }

    if (this.computedUserPoolProps.autoVerify) {
      const verificationMechanisms = [];
      if (this.computedUserPoolProps.autoVerify.email) {
        verificationMechanisms.push('EMAIL');
      }
      if (this.computedUserPoolProps.autoVerify.phone) {
        verificationMechanisms.push('PHONE');
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
    const oauthMappings = this.providerSetupResult.oauthMappings;
    if (oauthMappings[authProvidersList.amazon]) {
      output.amazonClientId = oauthMappings[authProvidersList.amazon];
    }
    if (oauthMappings[authProvidersList.facebook]) {
      output.facebookClientId = oauthMappings[authProvidersList.facebook];
    }
    if (oauthMappings[authProvidersList.google]) {
      output.googleClientId = oauthMappings[authProvidersList.google];
    }
    if (oauthMappings[authProvidersList.apple]) {
      output.appleClientId = oauthMappings[authProvidersList.apple];
    }

    if (this.providerSetupResult.providersList.length > 0) {
      output.socialProviders = JSON.stringify(
        this.providerSetupResult.providersList
      );
      // if any providers were defined, we must expose the oauth settings to the output
      if (this.oAuthSettings) {
        if (this.domainPrefix) {
          output.oauthDomain = `${this.domainPrefix}.auth.${
            Stack.of(this).region
          }.amazoncognito.com`;
        }

        output.oauthScope = JSON.stringify(
          this.oAuthSettings.scopes?.map((s) => s.scopeName) ?? []
        );
        output.oauthRedirectSignIn = this.oAuthSettings.callbackUrls
          ? this.oAuthSettings.callbackUrls.join(',')
          : '';
        output.oauthRedirectSignOut = this.oAuthSettings.logoutUrls
          ? this.oAuthSettings.logoutUrls.join(',')
          : '';
        output.oauthClientId = this.resources.userPoolClient.userPoolClientId;
        output.oauthResponseType = 'code';
      }
    }

    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };
}
