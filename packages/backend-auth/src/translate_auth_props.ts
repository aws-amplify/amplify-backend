import {
  AmazonProviderProps,
  AppleProviderProps,
  BasicLoginOptions,
  ExternalProviderProps,
  FacebookProviderProps,
  GoogleProviderProps,
  OidcProviderProps,
} from '@aws-amplify/auth-construct-alpha';
import { BackendSecretResolver } from '@aws-amplify/plugin-types';
import {
  AmazonProviderFactoryProps,
  AppleProviderFactoryProps,
  AuthLoginWithFactoryProps,
  ExternalProviderGeneralFactoryProps,
  FacebookProviderFactoryProps,
  GoogleProviderFactoryProps,
  OidcProviderFactoryProps,
} from './types.js';

/**
 * Translate an Auth factory's loginWith to its Auth construct counterpart. Backend secret fields will be resolved
 * to an CFN token and map to the required construct type. Note that not all construct secret fields are of sdk
 * SecretValue type, many are (wrongly) of type string as well.
 */
export const translateToAuthConstructLoginWith = (
  authFactoryLoginWith: AuthLoginWithFactoryProps,
  backendSecretResolver: BackendSecretResolver
): BasicLoginOptions & ExternalProviderProps => {
  const result: BasicLoginOptions & ExternalProviderProps =
    authFactoryLoginWith as BasicLoginOptions;
  if (!authFactoryLoginWith.externalProviders) {
    return result;
  }

  const externalProviders = authFactoryLoginWith.externalProviders;
  result.externalProviders = {
    ...(externalProviders as ExternalProviderGeneralFactoryProps),
  };

  const amazonProps = translateAmazonProps(
    backendSecretResolver,
    externalProviders.LoginWithAmazon
  );
  if (amazonProps) {
    result.externalProviders.LoginWithAmazon = amazonProps;
  }

  const appleProps = translateAppleProps(
    backendSecretResolver,
    externalProviders.SignInWithApple
  );
  if (appleProps) {
    result.externalProviders.SignInWithApple = appleProps;
  }

  const facebookProps = translateFacebookProps(
    backendSecretResolver,
    externalProviders.Facebook
  );
  if (facebookProps) {
    result.externalProviders.Facebook = facebookProps;
  }

  const oidcProps = translateOidcProps(
    backendSecretResolver,
    externalProviders.oidc
  );
  if (oidcProps) {
    result.externalProviders.oidc = oidcProps;
  }

  const googleProps = translateGoogleProps(
    backendSecretResolver,
    externalProviders.Google
  );
  if (googleProps) {
    result.externalProviders.Google = googleProps;
  }

  return result;
};

const translateAmazonProps = (
  backendSecretResolver: BackendSecretResolver,
  amazonProviderProps?: AmazonProviderFactoryProps
): AmazonProviderProps | undefined => {
  if (!amazonProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = amazonProviderProps;
  return {
    ...noSecretProps,
    clientSecret: backendSecretResolver
      .resolveSecret(clientSecret)
      .unsafeUnwrap(),
  };
};

const translateAppleProps = (
  backendSecretResolver: BackendSecretResolver,
  amazonProviderProps?: AppleProviderFactoryProps
): AppleProviderProps | undefined => {
  if (!amazonProviderProps) {
    return undefined;
  }

  const { privateKey, ...noSecretProps } = amazonProviderProps;
  return {
    ...noSecretProps,
    privateKey: backendSecretResolver.resolveSecret(privateKey).unsafeUnwrap(),
  };
};

const translateFacebookProps = (
  backendSecretResolver: BackendSecretResolver,
  facebookProviderProps?: FacebookProviderFactoryProps
): FacebookProviderProps | undefined => {
  if (!facebookProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = facebookProviderProps;
  return {
    ...noSecretProps,
    clientSecret: backendSecretResolver
      .resolveSecret(clientSecret)
      .unsafeUnwrap(),
  };
};

const translateOidcProps = (
  backendSecretResolver: BackendSecretResolver,
  oidcProviderProps?: OidcProviderFactoryProps
): OidcProviderProps | undefined => {
  if (!oidcProviderProps) {
    return undefined;
  }

  const { clientSecret, ...noSecretProps } = oidcProviderProps;
  return {
    ...noSecretProps,
    clientSecret: backendSecretResolver
      .resolveSecret(clientSecret)
      .unsafeUnwrap(),
  };
};

const translateGoogleProps = (
  backendSecretResolver: BackendSecretResolver,
  googleProviderProps?: GoogleProviderFactoryProps
): GoogleProviderProps | undefined => {
  if (!googleProviderProps) {
    return undefined;
  }

  const { clientSecretValue, ...noSecretProps } = googleProviderProps;
  return {
    ...noSecretProps,
    clientSecretValue: backendSecretResolver.resolveSecret(clientSecretValue),
  };
};
