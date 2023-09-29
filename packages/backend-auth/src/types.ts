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
  'clientSecretValue'
> & {
  clientSecretValue: BackendSecret;
};

/**
 * Apple provider properties.
 */
export type AppleProviderFactoryProps = Omit<
  AppleProviderProps,
  'privateKey'
> & {
  privateKey: BackendSecret;
};

/**
 * Amazon provider properties.
 */
export type AmazonProviderFactoryProps = Omit<
  AmazonProviderProps,
  'clientSecret'
> & {
  clientSecret: BackendSecret;
};

/**
 * Facebook provider properties.
 */
export type FacebookProviderFactoryProps = Omit<
  FacebookProviderProps,
  'clientSecret'
> & {
  clientSecret: BackendSecret;
};

/**
 * Oidc provider properties.
 */
export type OidcProviderFactoryProps = Omit<
  OidcProviderProps,
  'clientSecret'
> & {
  clientSecret: BackendSecret;
};

/**
 * External provider general properties.
 */
export type ExternalProviderGeneralFactoryProps = Omit<
  ExternalProviderOptions,
  'apple' | 'amazon' | 'facebook' | 'oidc' | 'google'
>;

/**
 * External provider group properties.
 */
export type ExternalProviderSpecificFactoryProps =
  ExternalProviderGeneralFactoryProps & {
    apple?: AppleProviderFactoryProps;
    amazon?: AmazonProviderFactoryProps;
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
