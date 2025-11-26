import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
  StableBackendIdentifiers,
} from '@aws-amplify/plugin-types';
import { describe, it } from 'node:test';
import { AuthLoginWithFactoryProps } from './types.js';
import { Construct } from 'constructs';
import { AuthProps, PhoneNumberLogin } from '@aws-amplify/auth-construct';
import { SecretValue } from 'aws-cdk-lib';
import assert from 'node:assert';
import { translateToAuthConstructLoginWith } from './translate_auth_props.js';
import { ParameterPathConversions } from '@aws-amplify/platform-core';

const phone: PhoneNumberLogin = {
  verificationMessage: (createCode: () => string) => `text${createCode()}text2`,
};
const googleClientId = 'googleId';
const googleClientSecret = 'googleSecret';
const facebookClientId = 'fbId';
const facebookClientSecret = 'fbSecret';
const amazonClientId = 'azId';
const amazonClientSecret = 'azSecret';
const oidcClientId = 'oidcId';
const oidcClientSecret = 'oidcSecret';
const oidcIssueURL = 'oidcIssueUrl';
const appleClientId = 'appleClientId';
const appleTeamId = 'appleTeamId';
const appleKeyId = 'appleKeyId';
const applePrivateKey = 'applePrivateKey';
const callbackUrls = ['a', 'b'];
const logoutUrls = ['a', 'b'];
const stableBackendHash = 'testStableBackendHash';
const domainPrefix = 'testDomainPrefix';

const testBackendIdentifier: BackendIdentifier = {
  namespace: 'testBackendId',
  name: 'testBranchName',
  type: 'branch',
};

const testStack = {} as Construct;

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): SecretValue => {
    return SecretValue.unsafePlainText(this.secretName);
  };
  resolvePath = (): ResolvePathResult => {
    return {
      branchSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier,
        this.secretName,
      ),
      sharedSecretPath: ParameterPathConversions.toParameterFullPath(
        testBackendIdentifier.namespace,
        this.secretName,
      ),
    };
  };
}

class TestBackendSecretResolver implements BackendSecretResolver {
  resolveSecret = (backendSecret: BackendSecret): SecretValue => {
    return backendSecret.resolve(testStack, testBackendIdentifier);
  };
  resolvePath = (backendSecret: BackendSecret): ResolvePathResult => {
    return backendSecret.resolvePath(testBackendIdentifier);
  };
}

class TestStableBackendIdentifiers implements StableBackendIdentifiers {
  getStableBackendHash = (): string => {
    return stableBackendHash;
  };
}

void describe('translateToAuthConstructLoginWith', () => {
  const backendResolver = new TestBackendSecretResolver();
  const stableBackendIdentifiers = new TestStableBackendIdentifiers();

  void it('translates with external providers', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      phone,
      externalProviders: {
        google: {
          clientId: new TestBackendSecret(googleClientId),
          clientSecret: new TestBackendSecret(googleClientSecret),
        },
        facebook: {
          clientId: new TestBackendSecret(facebookClientId),
          clientSecret: new TestBackendSecret(facebookClientSecret),
        },
        loginWithAmazon: {
          clientId: new TestBackendSecret(amazonClientId),
          clientSecret: new TestBackendSecret(amazonClientSecret),
        },
        oidc: [
          {
            clientId: new TestBackendSecret(oidcClientId),
            clientSecret: new TestBackendSecret(oidcClientSecret),
            issuerUrl: oidcIssueURL,
          },
        ],
        signInWithApple: {
          clientId: new TestBackendSecret(appleClientId),
          teamId: new TestBackendSecret(appleTeamId),
          keyId: new TestBackendSecret(appleKeyId),
          privateKey: new TestBackendSecret(applePrivateKey),
        },
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
      stableBackendIdentifiers,
    );

    const expected: AuthProps['loginWith'] = {
      phone,
      externalProviders: {
        google: {
          clientId: googleClientId,
          clientSecret: SecretValue.unsafePlainText(googleClientSecret),
        },
        facebook: {
          clientId: facebookClientId,
          clientSecret: facebookClientSecret,
        },
        loginWithAmazon: {
          clientId: amazonClientId,
          clientSecret: amazonClientSecret,
        },
        oidc: [
          {
            clientId: oidcClientId,
            clientSecret: oidcClientSecret,
            issuerUrl: oidcIssueURL,
          },
        ],
        signInWithApple: {
          clientId: appleClientId,
          teamId: appleTeamId,
          keyId: appleKeyId,
          privateKey: applePrivateKey,
        },
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
        domainPrefix: stableBackendHash,
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates with only a general provider attribute', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      phone,
      externalProviders: {
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
      stableBackendIdentifiers,
    );

    const expected: AuthProps['loginWith'] = {
      phone,
      externalProviders: {
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
        domainPrefix: stableBackendHash,
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates without custom domain prefix', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      externalProviders: {
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
      stableBackendIdentifiers,
    );

    const expected: AuthProps['loginWith'] = {
      externalProviders: {
        callbackUrls,
        logoutUrls,
        domainPrefix: stableBackendHash,
      },
    };

    assert.deepStrictEqual(translated, expected);
  });

  void it('translates with custom domain prefix', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      externalProviders: {
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
        domainPrefix: domainPrefix,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
      stableBackendIdentifiers,
    );

    const expected: AuthProps['loginWith'] = {
      externalProviders: {
        callbackUrls,
        logoutUrls,
        domainPrefix: domainPrefix,
      },
    };

    assert.deepStrictEqual(translated, expected);
  });

  void it('translates without external providers', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      phone,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
      stableBackendIdentifiers,
    );

    const expected: AuthProps['loginWith'] = {
      phone,
    };
    assert.deepStrictEqual(translated, expected);
  });
});
