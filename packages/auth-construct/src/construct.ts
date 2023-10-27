import { Construct } from 'constructs';
import {
  CfnParameter,
  RemovalPolicy,
  Stack,
  aws_cognito as cognito,
} from 'aws-cdk-lib';
import {
  AmplifyFunction,
  AuthResources,
  BackendOutputStorageStrategy,
  ResourceProvider,
} from '@aws-amplify/plugin-types';
import {
  Mfa,
  UserPool,
  UserPoolClient,
  UserPoolIdentityProviderAmazon,
  UserPoolIdentityProviderApple,
  UserPoolIdentityProviderFacebook,
  UserPoolIdentityProviderGoogle,
  UserPoolIdentityProviderOidc,
  UserPoolIdentityProviderSaml,
  UserPoolOperation,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput, authOutputKey } from '@aws-amplify/backend-output-schemas';
import { AuthProps, EmailLoginSettings, TriggerEvent } from './types.js';
import { DEFAULTS } from './defaults.js';
import { IFunction } from 'aws-cdk-lib/aws-lambda';
import {
  AttributionMetadataStorage,
  StackMetadataBackendOutputStorageStrategy,
} from '@aws-amplify/backend-output-storage';
import * as path from 'path';

type DefaultRoles = { auth: Role; unAuth: Role };
type IdentityProviderSetupResult = {
  oauthMappings: Record<string, string>;
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
   * Map from oauth provider to client id
   */
  private readonly oauthMappings: Record<string, string>;

  private readonly userPool: UserPool;

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

    const isSandbox = new CfnParameter(this, 'isSandbox', {
      type: 'String',
      description: 'Whether or not sandbox mode is in use.',
    }).valueAsString;

    // UserPool
    const userPoolProps: UserPoolProps = this.getUserPoolProps(
      props,
      isSandbox
    );
    this.userPool = new cognito.UserPool(this, 'UserPool', userPoolProps);

    // UserPool - Identity Providers
    const providerSetupResult = this.setupIdentityProviders(
      this.userPool,
      props.loginWith
    );
    this.oauthMappings = providerSetupResult.oauthMappings;

    // UserPool Client
    const externalProviders = props.loginWith.externalProviders;
    const userPoolClient = new cognito.UserPoolClient(
      this,
      'UserPoolAppClient',
      {
        userPool: this.userPool,
        authFlows: DEFAULTS.AUTH_FLOWS,
        preventUserExistenceErrors: DEFAULTS.PREVENT_USER_EXISTENCE_ERRORS,
        oAuth: {
          ...(externalProviders?.callbackUrls
            ? { callbackUrls: externalProviders.callbackUrls }
            : {}),
          ...(externalProviders?.logoutUrls
            ? { logoutUrls: externalProviders.logoutUrls }
            : {}),
          ...(externalProviders?.scopes
            ? { scopes: externalProviders.scopes }
            : {}),
        },
      }
    );

    // Auth / UnAuth Roles
    const { auth, unAuth } = this.setupAuthAndUnAuthRoles();

    // Identity Pool
    const { identityPool, identityPoolRoleAttachment } = this.setupIdentityPool(
      { auth, unAuth },
      this.userPool,
      userPoolClient,
      providerSetupResult
    );

    // expose resources
    this.resources = {
      userPool: this.userPool,
      userPoolClient,
      authenticatedUserIamRole: auth,
      unauthenticatedUserIamRole: unAuth,
      cfnResources: {
        identityPool,
        identityPoolRoleAttachment,
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
   * Create Auth/UnAuth Roles
   * @returns DefaultRoles
   */
  private setupAuthAndUnAuthRoles = (): DefaultRoles => {
    const result: DefaultRoles = {
      auth: new Role(this, 'authenticatedUserRole', {
        assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
      }),
      unAuth: new Role(this, 'unauthenticatedUserRole', {
        assumedBy: new FederatedPrincipal('cognito-identity.amazonaws.com'),
      }),
    };
    return result;
  };

  /**
   * Setup Identity Pool with default roles/role mappings, and register providers
   */
  private setupIdentityPool = (
    roles: DefaultRoles,
    userPool: UserPool,
    userPoolClient: UserPoolClient,
    providerSetupResult: IdentityProviderSetupResult
  ) => {
    // setup identity pool
    const region = Stack.of(this).region;
    const identityPool = new cognito.CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: DEFAULTS.ALLOW_UNAUTHENTICATED_IDENTITIES,
    });
    const identityPoolRoleAttachment =
      new cognito.CfnIdentityPoolRoleAttachment(
        this,
        'IdentityPoolRoleAttachment',
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
        `arn:${region}:iam::${
          Stack.of(this).account
        }:oidc-provider/cognito-idp.${region}.amazonaws.com/${
          providerSetupResult.oidc.providerName
        }`,
      ];
    }
    if (providerSetupResult.saml) {
      identityPool.samlProviderArns = [
        `arn:${region}:iam::${Stack.of(this).account}:saml-provider/${
          providerSetupResult.saml.providerName
        }`,
      ];
    }
    return {
      identityPool,
      identityPoolRoleAttachment,
    };
  };

  /**
   * Process props into UserPoolProps (set defaults if needed)
   */
  private getUserPoolProps = (
    props: AuthProps,
    isSandbox: string
  ): UserPoolProps => {
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
      deletionProtection: isSandbox === 'true' ? false : true,
      removalPolicy:
        isSandbox === 'true' ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN,
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
    const result: IdentityProviderSetupResult = {
      oauthMappings: {},
    };
    // external providers
    const external = loginOptions.externalProviders;
    if (!external) {
      return result;
    }
    if (external.google) {
      const googleProps = external.google;
      result.google = new cognito.UserPoolIdentityProviderGoogle(
        this,
        'GoogleIdP',
        {
          userPool,
          clientId: googleProps.clientId,
          clientSecretValue: googleProps.clientSecret,
          attributeMapping: googleProps.attributeMapping,
          scopes: googleProps.scopes,
        }
      );
      result.oauthMappings[authProvidersList.google] = external.google.clientId;
    }
    if (external.facebook) {
      result.facebook = new cognito.UserPoolIdentityProviderFacebook(
        this,
        'FacebookIDP',
        {
          userPool,
          ...external.facebook,
        }
      );
      result.oauthMappings[authProvidersList.facebook] =
        external.facebook.clientId;
    }
    if (external.loginWithAmazon) {
      result.amazon = new cognito.UserPoolIdentityProviderAmazon(
        this,
        'AmazonIDP',
        {
          userPool,
          ...external.loginWithAmazon,
        }
      );
      result.oauthMappings[authProvidersList.amazon] =
        external.loginWithAmazon.clientId;
    }
    if (external.signInWithApple) {
      result.apple = new cognito.UserPoolIdentityProviderApple(
        this,
        'AppleIDP',
        {
          userPool,
          ...external.signInWithApple,
        }
      );
      result.oauthMappings[authProvidersList.apple] =
        external.signInWithApple.clientId;
    }
    if (external.oidc) {
      result.oidc = new cognito.UserPoolIdentityProviderOidc(this, 'OidcIDP', {
        userPool,
        ...external.oidc,
      });
    }
    if (external.saml) {
      result.saml = new cognito.UserPoolIdentityProviderSaml(this, 'SamlIDP', {
        userPool,
        ...external.saml,
      });
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
      identityPoolId: this.resources.cfnResources.identityPool.ref,
      authRegion: Stack.of(this).region,
    };
    if (this.oauthMappings[authProvidersList.amazon]) {
      output.amazonClientId = this.oauthMappings[authProvidersList.amazon];
    }
    if (this.oauthMappings[authProvidersList.facebook]) {
      output.facebookClientId = this.oauthMappings[authProvidersList.facebook];
    }
    if (this.oauthMappings[authProvidersList.google]) {
      output.googleClientId = this.oauthMappings[authProvidersList.google];
    }
    if (this.oauthMappings[authProvidersList.apple]) {
      output.appleClientId = this.oauthMappings[authProvidersList.apple];
    }
    outputStorageStrategy.addBackendOutputEntry(authOutputKey, {
      version: '1',
      payload: output,
    });
  };

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
}
