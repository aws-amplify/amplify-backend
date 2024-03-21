import {
  AmazonProviderProps,
  AppleProviderProps,
  AuthProps,
  ExternalProviderOptions,
  FacebookProviderProps,
  GoogleProviderProps,
  OidcProviderProps,
} from '@aws-amplify/auth-construct-alpha';
import {
  BackendSecret,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  ResourceAccessAcceptor,
  ResourceAccessAcceptorFactory,
  ResourceProvider,
} from '@aws-amplify/plugin-types';

/**
 * This utility allows us to expand nested types in auto complete prompts.
 * @example
 * type OtherType = {
 *  property1: string;
 *  property2: number;
 * }
 * type SomeType = {
 *  property2: Expand<OtherType>;
 * }
 */
export type Expand<T> = T extends infer O
  ? {
      [K in keyof O]: O[K];
    }
  : never;

/**
 * Google provider properties.
 */
export type GoogleProviderFactoryProps = Omit<
  GoogleProviderProps,
  'clientId' | 'clientSecret'
> & {
  /**
   * The client id recognized by Google APIs.
   * @see https://developers.google.com/identity/sign-in/web/sign-in#specify_your_apps_client_id
   */
  clientId: BackendSecret;
  /**
   * The client secret to be accompanied with clientId for Google APIs to authenticate the client as SecretValue
   * @see https://developers.google.com/identity/sign-in/web/sign-in
   * @default none
   */
  clientSecret: BackendSecret;
};

/**
 * Apple provider properties.
 */
export type AppleProviderFactoryProps = Omit<
  AppleProviderProps,
  'clientId' | 'teamId' | 'keyId' | 'privateKey'
> & {
  /**
   * The client id recognized by Apple APIs.
   * @see https://developer.apple.com/documentation/sign_in_with_apple/clientconfigi/3230948-clientid
   */
  clientId: BackendSecret;
  /**
   * The teamId for Apple APIs to authenticate the client.
   */
  teamId: BackendSecret;
  /**
   * The keyId (of the same key, which content has to be later supplied as `privateKey`) for Apple APIs to authenticate the client.
   */
  keyId: BackendSecret;
  /**
   * The privateKey content for Apple APIs to authenticate the client.
   */
  privateKey: BackendSecret;
};

/**
 * Amazon provider properties.
 */
export type AmazonProviderFactoryProps = Omit<
  AmazonProviderProps,
  'clientId' | 'clientSecret'
> & {
  /**
   * The client id recognized by 'Login with Amazon' APIs.
   * @see https://developer.amazon.com/docs/login-with-amazon/security-profile.html#client-identifier
   */
  clientId: BackendSecret;

  /**
   * The client secret to be accompanied with clientId for 'Login with Amazon' APIs to authenticate the client.
   * @see https://developer.amazon.com/docs/login-with-amazon/security-profile.html#client-identifier
   */
  clientSecret: BackendSecret;
};

/**
 * Facebook provider properties.
 */
export type FacebookProviderFactoryProps = Omit<
  FacebookProviderProps,
  'clientId' | 'clientSecret'
> & {
  /**
   * The client id recognized by Facebook APIs.
   */
  clientId: BackendSecret;

  /**
   * The client secret to be accompanied with clientUd for Facebook to authenticate the client.
   * @see https://developers.facebook.com/docs/facebook-login/security#appsecret
   */
  clientSecret: BackendSecret;
};

/**
 * Oidc provider properties.
 */
export type OidcProviderFactoryProps = Omit<
  OidcProviderProps,
  'clientId' | 'clientSecret'
> & {
  /**
   * The client id
   */
  clientId: BackendSecret;
  /**
   * The client secret
   */
  clientSecret: BackendSecret;
};

/**
 * External provider general properties.
 */
export type ExternalProviderGeneralFactoryProps = Omit<
  ExternalProviderOptions,
  'signInWithApple' | 'loginWithAmazon' | 'facebook' | 'oidc' | 'google'
>;

/**
 * External provider group properties.
 */
export type ExternalProviderSpecificFactoryProps =
  ExternalProviderGeneralFactoryProps & {
    /**
     * SignInWithApple Settings
     */
    signInWithApple?: AppleProviderFactoryProps;
    /**
     * LoginWithAmazon Settings
     */
    loginWithAmazon?: AmazonProviderFactoryProps;
    /**
     * Facebook OAuth Settings
     */
    facebook?: FacebookProviderFactoryProps;
    /**
     * OIDC Settings
     */
    oidc?: OidcProviderFactoryProps[];
    /**
     * Google OAuth Settings
     */
    google?: GoogleProviderFactoryProps;
  };

/**
 * Auth factory loginWith attribute.
 */
export type AuthLoginWithFactoryProps = Omit<
  AuthProps['loginWith'],
  'externalProviders'
> & {
  /**
   * Configure OAuth, OIDC, and SAML login providers
   */
  externalProviders?: ExternalProviderSpecificFactoryProps;
};

export type AuthAccessBuilder = {
  resource: (
    other: ConstructFactory<ResourceProvider & ResourceAccessAcceptorFactory>
  ) => AuthActionBuilder;
};

export type AuthActionBuilder = {
  to: (actions: AuthAction[]) => AuthAccessDefinition;
};

export type AuthAccessGenerator = (
  allow: AuthAccessBuilder
) => AuthAccessDefinition[];

export type AuthAccessDefinition = {
  getResourceAccessAcceptor: (
    getInstanceProps: ConstructFactoryGetInstanceProps
  ) => ResourceAccessAcceptor;

  // list of auth actions you can perform on the resource
  actions: AuthAction[];
};

export type AuthAction = ActionIam | ActionMeta;

/** @todo https://github.com/aws-amplify/amplify-backend/issues/1111 */
export type ActionMeta =
  | 'manageUsers'
  | 'manageGroups'
  | 'manageGroupMembership'
  | 'manageUserDevices'
  | 'managePasswordRecovery';

/**
 * This maps to Cognito IAM actions.
 * @todo https://github.com/aws-amplify/amplify-backend/issues/1111
 * @see https://aws.permissions.cloud/iam/cognito-idp
 */
export type ActionIam =
  | 'addUserToGroup'
  | 'createUser'
  | 'deleteUser'
  | 'deleteUserAttributes'
  | 'disableUser'
  | 'enableUser'
  | 'forgetDevice'
  | 'getDevice'
  | 'getUser'
  | 'listDevices'
  | 'listGroupsForUser'
  | 'removeUserFromGroup'
  | 'resetUserPassword'
  | 'setUserMfaPreference'
  | 'setUserPassword'
  | 'setUserSettings'
  | 'updateDeviceStatus'
  | 'updateUserAttributes';
