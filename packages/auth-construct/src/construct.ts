import { Construct } from 'constructs';
import { Stack, aws_cognito as cognito } from 'aws-cdk-lib';
import { Architecture, IFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import {
  NodejsFunction,
  NodejsFunctionProps,
  OutputFormat,
} from 'aws-cdk-lib/aws-lambda-nodejs';
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
  UserPoolTriggers,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, Role } from 'aws-cdk-lib/aws-iam';
import { AuthOutput } from '@aws-amplify/backend-output-schemas/auth';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { AuthProps, PasswordlessAuthOptions, TriggerEvent } from './types.js';
import { DEFAULTS } from './defaults.js';
import {
  AuthAttributeFactory,
  AuthCustomAttributeBase,
  AuthCustomAttributeFactory,
  AuthStandardAttribute,
} from './attributes.js';
import { StackMetadataBackendOutputStorageStrategy } from '@aws-amplify/backend-output-storage';
import { join } from 'path';

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

    // UserPool
    const userPoolProps: UserPoolProps = this.getUserPoolProps(id, props);
    this.userPool = new cognito.UserPool(this, 'UserPool', userPoolProps);

    // UserPool - Identity Providers
    const providerSetupResult = this.setupIdentityProviders(
      this.userPool,
      props.loginWith
    );
    this.oauthMappings = providerSetupResult.oauthMappings;

    // UserPool Client
    const userPoolClient = new cognito.UserPoolClient(
      this,
      'UserPoolWebClient',
      {
        userPool: this.userPool,
        authFlows: DEFAULTS.AUTH_FLOWS,
        preventUserExistenceErrors: DEFAULTS.PREVENT_USER_EXISTENCE_ERRORS,
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
   * @param id - Stack ID
   * @param props - AuthProps
   * @returns UserPoolProps
   */
  private getUserPoolProps = (id: string, props: AuthProps): UserPoolProps => {
    const emailEnabled = props.loginWith.email ? true : false;
    const phoneEnabled = props.loginWith.phoneNumber ? true : false;
    // check for customization
    let userVerificationSettings: cognito.UserVerificationConfig = {};
    if (emailEnabled && typeof props.loginWith.email === 'object') {
      const emailSettings = props.loginWith.email;
      userVerificationSettings = {
        emailBody: emailSettings.verificationEmailBody,
        emailStyle: emailSettings.verificationEmailStyle,
        emailSubject: emailSettings.verificationEmailSubject,
      };
    }
    if (phoneEnabled && typeof props.loginWith.phoneNumber === 'object') {
      const phoneSettings = props.loginWith.phoneNumber;
      userVerificationSettings = {
        ...userVerificationSettings,
        smsMessage: phoneSettings.verificationMessage,
      };
    }
    // extract standard and custom attributes
    let standardAttributes: cognito.StandardAttributes = {};
    let customAttributes: {
      [key: string]: cognito.ICustomAttribute;
    } = {};
    // standard attribute names must be unique to prevent unintentional behavior
    const attributeNames: Set<string> = new Set();
    // custom attribute names must be unique (they are given a 'custom:' prefix so they don't interfere with standard attributes)
    const customAttributeNames: Set<string> = new Set();
    if (props.userAttributes) {
      for (const attr of props.userAttributes) {
        if (attr instanceof AuthStandardAttribute) {
          if (attributeNames.has(attr['name'])) {
            throw new Error(
              `Invalid userAttributes. Duplicate attribute name found: ${attr['name']}.`
            );
          }
          attributeNames.add(attr['name']);
          standardAttributes = {
            ...standardAttributes,
            ...attr['_toStandardAttributes'](),
          };
        } else if (attr instanceof AuthCustomAttributeBase) {
          if (customAttributeNames.has(attr['name'])) {
            throw new Error(
              `Invalid userAttributes. Duplicate custom attribute name found: ${attr['name']}.`
            );
          }
          customAttributeNames.add(attr['name']);
          customAttributes = {
            ...customAttributes,
            ...attr['_toCustomAttributes'](),
          };
        }
      }
    }

    const passwordlessTriggers = this.getPasswordlessTriggers(
      id,
      props.passwordlessAuth
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
      lambdaTriggers: {
        ...passwordlessTriggers,
      },
      selfSignUpEnabled: DEFAULTS.ALLOW_SELF_SIGN_UP,
      mfa: this.getMFAEnforcementType(props.multifactor),
      mfaMessage:
        typeof props.multifactor === 'object' &&
        props.multifactor.enforcementType !== 'OFF' &&
        props.multifactor.sms === true
          ? props.multifactor.smsMessage
          : undefined,
      mfaSecondFactor:
        typeof props.multifactor === 'object' &&
        props.multifactor.enforcementType !== 'OFF'
          ? { sms: props.multifactor.sms, otp: props.multifactor.totp }
          : undefined,
      accountRecovery: this.getAccountRecoverySetting(
        emailEnabled,
        phoneEnabled,
        props.accountRecovery
      ),
    };
    return userPoolProps;
  };

  private getPasswordlessTriggers = (
    id: string,
    options?: PasswordlessAuthOptions
  ): UserPoolTriggers => {
    if (!options) {
      return {};
    }

    const commonOptions: NodejsFunctionProps = {
      entry: new URL(
        './passwordless-auth/custom_auth_triggers.js',
        import.meta.url
      ).pathname,
      handler: 'defineAuthChallengeHandler',
      runtime: Runtime.NODEJS_18_X,
      architecture: Architecture.ARM_64,
      bundling: {
        format: OutputFormat.ESM,
      },
    };

    const defineAuthChallenge = new NodejsFunction(
      this,
      `DefineAuthChallenge${id}`,
      {
        handler: 'defineAuthChallengeHandler',
        ...commonOptions,
      }
    );

    const createAuthChallenge = new NodejsFunction(
      this,
      `CreateAuthChallenge${id}`,
      {
        handler: 'createAuthChallengeHandler',
        ...commonOptions,
      }
    );

    const verifyAuthChallengeResponse = new NodejsFunction(
      this,
      `VerifyAuthChallengeResponse${id}`,
      {
        handler: 'verifyAuthChallengeHandler',
        ...commonOptions,
      }
    );

    return {
      defineAuthChallenge,
      createAuthChallenge,
      verifyAuthChallengeResponse,
    };
  };

  /**
   * Determine the account recovery option based on enabled login methods.
   * @param emailEnabled - is email enabled
   * @param phoneEnabled - is phone enabled
   * @param accountRecovery - the user provided account recovery setting
   * @returns account recovery setting
   */
  private getAccountRecoverySetting = (
    emailEnabled: boolean,
    phoneEnabled: boolean,
    accountRecovery: AuthProps['accountRecovery']
  ): cognito.AccountRecovery | undefined => {
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
   * Convert user friendly Mfa type to cognito Mfa type.
   * This eliminates the need for users to import cognito.Mfa.
   * @param mfa - MFA Enforcement type string value
   * @returns cognito MFA enforcement type
   */
  private getMFAEnforcementType = (
    mfa: AuthProps['multifactor']
  ): Mfa | undefined => {
    if (mfa) {
      switch (mfa.enforcementType) {
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
      result.google = new cognito.UserPoolIdentityProviderGoogle(
        this,
        'GoogleIdP',
        {
          userPool,
          ...external.google,
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
    if (external.amazon) {
      result.amazon = new cognito.UserPoolIdentityProviderAmazon(
        this,
        'AmazonIDP',
        {
          userPool,
          ...external.amazon,
        }
      );
      result.oauthMappings[authProvidersList.amazon] = external.amazon.clientId;
    }
    if (external.apple) {
      result.apple = new cognito.UserPoolIdentityProviderApple(
        this,
        'AppleIDP',
        {
          userPool,
          ...external.apple,
        }
      );
      result.oauthMappings[authProvidersList.apple] = external.apple.clientId;
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

  /**
   * Utility for adding user attributes.
   *
   * Example:
   * userAttributes: [
   *  AmplifyAuth.attribute('address').immutable().required(),
   * ]
   */
  public static attribute = AuthAttributeFactory;
  /**
   * Utility for adding custom attributes.
   *
   * Example:
   * userAttributes: [
   *  AmplifyAuth.customAttribute.number('petsCount').min(0).max(5)
   * ]
   */
  public static customAttribute = new AuthCustomAttributeFactory();
}
