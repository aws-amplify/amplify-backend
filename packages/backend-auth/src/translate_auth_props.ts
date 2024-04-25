import {
  AmazonProviderProps,
  AppleProviderProps,
  AuthProps,
  FacebookProviderProps,
  GoogleProviderProps,
  OidcProviderProps,
} from '@aws-amplify/auth-construct';
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
): AuthProps['loginWith'] => {
  const result: AuthProps['loginWith'] =
    authFactoryLoginWith as AuthProps['loginWith'];
  if (!authFactoryLoginWith.externalProviders) {
    return result;
  }

  const externalProviders = authFactoryLoginWith.externalProviders;
  result.externalProviders = {
    ...(externalProviders as ExternalProviderGeneralFactoryProps),
  };

  const amazonProps = translateAmazonProps(
    backendSecretResolver,
    externalProviders.loginWithAmazon
  );
  if (amazonProps) {
    result.externalProviders.loginWithAmazon = amazonProps;
  }

  const appleProps = translateAppleProps(
    backendSecretResolver,
    externalProviders.signInWithApple
  );
  if (appleProps) {
    result.externalProviders.signInWithApple = appleProps;
  }

  const facebookProps = translateFacebookProps(
    backendSecretResolver,
    externalProviders.facebook
  );
  if (facebookProps) {
    result.externalProviders.facebook = facebookProps;
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
    externalProviders.google
  );
  if (googleProps) {
    result.externalProviders.google = googleProps;
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

  const { clientId, clientSecret, ...noSecretProps } = amazonProviderProps;
  return {
    ...noSecretProps,
    clientId: backendSecretResolver.resolveSecret(clientId).unsafeUnwrap(),
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

  const { clientId, teamId, keyId, privateKey, ...noSecretProps } =
    amazonProviderProps;
  return {
    ...noSecretProps,
    clientId: backendSecretResolver.resolveSecret(clientId).unsafeUnwrap(),
    teamId: backendSecretResolver.resolveSecret(teamId).unsafeUnwrap(),
    keyId: backendSecretResolver.resolveSecret(keyId).unsafeUnwrap(),
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

  const { clientId, clientSecret, ...noSecretProps } = facebookProviderProps;
  return {
    ...noSecretProps,
    clientId: backendSecretResolver.resolveSecret(clientId).unsafeUnwrap(),
    clientSecret: backendSecretResolver
      .resolveSecret(clientSecret)
      .unsafeUnwrap(),
  };
};

const translateOidcProps = (
  backendSecretResolver: BackendSecretResolver,
  oidcProviderProps?: OidcProviderFactoryProps[]
): OidcProviderProps[] | undefined => {
  if (!oidcProviderProps || oidcProviderProps.length === 0) {
    return undefined;
  }

  const result = [];
  for (const provider of oidcProviderProps) {
    const { clientId, clientSecret, ...noSecretProps } = provider;
    result.push({
      ...noSecretProps,
      clientId: backendSecretResolver.resolveSecret(clientId).unsafeUnwrap(),
      clientSecret: backendSecretResolver
        .resolveSecret(clientSecret)
        .unsafeUnwrap(),
    });
  }

  return result;
};

const translateGoogleProps = (
  backendSecretResolver: BackendSecretResolver,
  googleProviderProps?: GoogleProviderFactoryProps
): GoogleProviderProps | undefined => {
  if (!googleProviderProps) {
    return undefined;
  }

  const {
    clientId,
    clientSecret: clientSecretValue,
    ...noSecretProps
  } = googleProviderProps;
  return {
    ...noSecretProps,
    clientId: backendSecretResolver.resolveSecret(clientId).unsafeUnwrap(),
    clientSecret: backendSecretResolver.resolveSecret(clientSecretValue),
  };
};
