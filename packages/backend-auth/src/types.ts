import {
  AmazonProviderProps,
  AppleProviderProps,
  BasicLoginOptions,
  ExternalProviderOptions,
  ExternalProviderProps,
  FacebookProviderProps,
  GoogleProviderProps,
  OidcProviderProps,
} from '@aws-amplify/auth-construct-alpha';
import { BackendSecret } from '@aws-amplify/plugin-types';

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
    signInWithApple?: AppleProviderFactoryProps;
    loginWithAmazon?: AmazonProviderFactoryProps;
    facebook?: FacebookProviderFactoryProps;
    oidc?: OidcProviderFactoryProps;
    google?: GoogleProviderFactoryProps;
  };

/**
 * External provider properties.
 */
export type ExternalProviderFactoryProps = Omit<
  ExternalProviderProps,
  'externalProviders'
> & {
  externalProviders?: ExternalProviderSpecificFactoryProps;
};

/**
 * Auth factory loginWith attribute.
 */
export type AuthLoginWithFactoryProps = BasicLoginOptions &
  ExternalProviderFactoryProps;
