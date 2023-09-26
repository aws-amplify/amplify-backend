import {
  AmazonProvider,
  AppleProvider,
  BasicLoginOptions,
  ExternalProviderGroup,
  ExternalProviders,
  FacebookProvider,
  GoogleProvider,
  OidcProvider,
} from '@aws-amplify/auth-construct-alpha';
import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';

/**
 * Google provider properties.
 */
export type GoogleProviderProps = Omit<GoogleProvider, 'clientSecretValue'> & {
  clientSecretValue: BackendSecret;
};

/**
 * Apple provider properties.
 */
export type AppleProviderProps = Omit<AppleProvider, 'privateKey'> & {
  privateKey: BackendSecret;
};

/**
 * Amazon provider properties.
 */
export type AmazonProviderProps = Omit<AmazonProvider, 'clientSecret'> & {
  clientSecret: BackendSecret;
};

/**
 * Facebook provider properties.
 */
export type FacebookProviderProps = Omit<FacebookProvider, 'clientSecret'> & {
  clientSecret: BackendSecret;
};

/**
 * Oidc provider properties.
 */
export type OidcProviderProps = Omit<OidcProvider, 'clientSecret'> & {
  clientSecret: BackendSecret;
};

type ExternalGroupGeneralProps = Omit<
  ExternalProviderGroup,
  'apple' | 'amazon' | 'facebook' | 'oidc' | 'google'
>;

/**
 * External provider group properties.
 */
export type ExternalProviderGroupProps = ExternalGroupGeneralProps & {
  apple?: AppleProviderProps;
  amazon?: AmazonProviderProps;
  facebook?: FacebookProviderProps;
  oidc?: OidcProviderProps;
  google?: GoogleProviderProps;
};

/**
 * External provider properties.
 */
export type ExternalProviderProps = Omit<ExternalProviders, 'externalProviders'> & {
  externalProviders?: ExternalProviderGroupProps;
};

/**
 * Auth factory loginWith attribute.
 */
export type AuthFactoryLoginWith = BasicLoginOptions & ExternalProviderProps;

/**
 * Translate an Auth factory's loginWith to its Auth construct counterpart. Backend secret fields will be resolved
 * to an CFN token and map to the required construct type. Note that not construct secret fields are of sdk SecretValue
 *  type, many are (wrongly) of type string as well.
 */
export const translateToAuthConstructLoginWith = (
  scope: Construct,
  backendId: UniqueBackendIdentifier,
  authFactoryLoginWith: AuthFactoryLoginWith
): BasicLoginOptions & ExternalProviders => {
  const result: BasicLoginOptions & ExternalProviders =
    authFactoryLoginWith as BasicLoginOptions;
  if (!authFactoryLoginWith.externalProviders) {
    return result;
  }

  const externalProviders = authFactoryLoginWith.externalProviders;
  result.externalProviders = {
    ...(externalProviders as ExternalGroupGeneralProps),
  };

  const amazonProps = translateAmazonProps(
    scope,
    backendId,
    externalProviders.amazon
  );
  if (amazonProps) {
    result.externalProviders.amazon = amazonProps;
  }

  const appleProps = translateAppleProps(
    scope,
    backendId,
    externalProviders.apple
  );
  if (appleProps) {
    result.externalProviders.apple = appleProps;
  }

  const facebookProps = translateFacebookProps(
    scope,
    backendId,
    externalProviders.facebook
  );
  if (facebookProps) {
    result.externalProviders.facebook = facebookProps;
  }

  const oidcProps = translateOidcProps(
    scope,
    backendId,
    externalProviders.oidc
  );
  if (oidcProps) {
    result.externalProviders.oidc = oidcProps;
  }

  const googleProps = translateGoogleProps(
    scope,
    backendId,
    externalProviders.google
  );
  if (googleProps) {
    result.externalProviders.google = googleProps;
  }

  return result;
};

const translateAmazonProps = (
  scope: Construct,
  uniqueBackendIdentifier: UniqueBackendIdentifier,
  amazonProviderProps?: AmazonProviderProps
): AmazonProvider | undefined => {
  if (!amazonProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = amazonProviderProps;
  return {
    ...noSecretProps,
    clientSecret: clientSecret?.resolve(scope, uniqueBackendIdentifier),
  };
};

const translateAppleProps = (
  scope: Construct,
  uniqueBackendIdentifier: UniqueBackendIdentifier,
  amazonProviderProps?: AppleProviderProps
): AppleProvider | undefined => {
  if (!amazonProviderProps) {
    return undefined;
  }

  const { privateKey, ...noSecretProps } = amazonProviderProps;
  return {
    ...noSecretProps,
    privateKey: privateKey?.resolve(scope, uniqueBackendIdentifier),
  };
};

const translateFacebookProps = (
  scope: Construct,
  uniqueBackendIdentifier: UniqueBackendIdentifier,
  facebookProviderProps?: FacebookProviderProps
): FacebookProvider | undefined => {
  if (!facebookProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = facebookProviderProps;
  return {
    ...noSecretProps,
    clientSecret: clientSecret?.resolve(scope, uniqueBackendIdentifier),
  };
};

const translateOidcProps = (
  scope: Construct,
  uniqueBackendIdentifier: UniqueBackendIdentifier,
  oidcProviderProps?: OidcProviderProps
): OidcProvider | undefined => {
  if (!oidcProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = oidcProviderProps;
  return {
    ...noSecretProps,
    clientSecret: clientSecret?.resolve(scope, uniqueBackendIdentifier),
  };
};

const translateGoogleProps = (
  scope: Construct,
  uniqueBackendIdentifier: UniqueBackendIdentifier,
  googleProviderProps?: GoogleProviderProps
): GoogleProvider | undefined => {
  if (!googleProviderProps) {
    return undefined;
  }

  const { clientSecretValue, ...noSecretProps } = googleProviderProps;
  return {
    ...noSecretProps,
    clientSecretValue: SecretValue.unsafePlainText(
      clientSecretValue.resolve(scope, uniqueBackendIdentifier)
    ),
  };
};
