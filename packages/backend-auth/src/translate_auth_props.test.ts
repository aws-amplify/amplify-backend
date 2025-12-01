import {
  BackendIdentifier,
  BackendSecret,
  BackendSecretResolver,
  ResolvePathResult,
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

void describe('translateToAuthConstructLoginWith', () => {
  const backendResolver = new TestBackendSecretResolver();

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
    );

    const expected: AuthProps['loginWith'] = {
      phone,
      externalProviders: {
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
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
    );

    const expected: AuthProps['loginWith'] = {
      phone,
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates email OTP configuration', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates SMS OTP configuration', () => {
    const phoneConfig = {
      verificationMessage: (createCode: () => string) =>
        `text${createCode()}text2`,
      otpLogin: true,
    };
    const loginWith: AuthLoginWithFactoryProps = {
      phone: phoneConfig,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      phone: {
        verificationMessage: phoneConfig.verificationMessage,
        otpLogin: true,
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates WebAuthn boolean to default configuration', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
      webAuthn: true,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: true,
      webAuthn: {
        relyingPartyId: 'AUTO',
        userVerification: 'preferred',
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates WebAuthn custom configuration with all properties', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
      webAuthn: {
        relyingPartyId: 'example.com',
        userVerification: 'required',
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: true,
      webAuthn: {
        relyingPartyId: 'example.com',
        userVerification: 'required',
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates WebAuthn custom configuration with partial properties', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
      webAuthn: {
        relyingPartyId: 'localhost',
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: true,
      webAuthn: {
        relyingPartyId: 'localhost',
        userVerification: 'preferred',
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates combined passwordless factors', () => {
    const phoneConfig = {
      verificationMessage: (createCode: () => string) =>
        `text${createCode()}text2`,
      otpLogin: true,
    };
    const loginWith: AuthLoginWithFactoryProps = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
      phone: phoneConfig,
      webAuthn: {
        relyingPartyId: 'example.com',
        userVerification: 'required',
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
      phone: {
        verificationMessage: phoneConfig.verificationMessage,
        otpLogin: true,
      },
      webAuthn: {
        relyingPartyId: 'example.com',
        userVerification: 'required',
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('translates combined passwordless with WebAuthn boolean', () => {
    const phoneConfig = {
      verificationMessage: (createCode: () => string) =>
        `text${createCode()}text2`,
      otpLogin: true,
    };
    const loginWith: AuthLoginWithFactoryProps = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
      phone: phoneConfig,
      webAuthn: true,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    const expected: AuthProps['loginWith'] = {
      email: {
        verificationEmailStyle: 'CODE',
        otpLogin: true,
      },
      phone: {
        verificationMessage: phoneConfig.verificationMessage,
        otpLogin: true,
      },
      webAuthn: {
        relyingPartyId: 'AUTO',
        userVerification: 'preferred',
      },
    };
    assert.deepStrictEqual(translated, expected);
  });

  void it('does not add otpLogin when not specified for email', () => {
    const emailBody = (code: () => string) => `Your code is ${code()}`;
    const loginWith: AuthLoginWithFactoryProps = {
      email: {
        verificationEmailStyle: 'CODE',
        verificationEmailSubject: 'Verify your email',
        verificationEmailBody: emailBody,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(
      (translated.email as Record<string, unknown>)?.otpLogin,
      undefined,
    );
    assert.deepStrictEqual(translated, {
      email: {
        verificationEmailStyle: 'CODE',
        verificationEmailSubject: 'Verify your email',
        verificationEmailBody: emailBody,
      },
    });
  });

  void it('does not add otpLogin when not specified for phone', () => {
    const phoneConfig = {
      verificationMessage: (createCode: () => string) =>
        `text${createCode()}text2`,
    };
    const loginWith: AuthLoginWithFactoryProps = {
      phone: phoneConfig,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(
      (translated.phone as Record<string, unknown>)?.otpLogin,
      undefined,
    );
    assert.deepStrictEqual(translated, {
      phone: {
        verificationMessage: phoneConfig.verificationMessage,
      },
    });
  });

  void it('does not add webAuthn when not specified', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
      phone: true,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(translated.webAuthn, undefined);
    assert.deepStrictEqual(translated, {
      email: true,
      phone: true,
    });
  });

  void it('preserves existing configuration without adding passwordless properties', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: {
        verificationEmailStyle: 'CODE',
      },
      phone: {
        verificationMessage: (createCode: () => string) =>
          `text${createCode()}text2`,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(
      (translated.email as Record<string, unknown>)?.otpLogin,
      undefined,
    );
    assert.strictEqual(
      (translated.phone as Record<string, unknown>)?.otpLogin,
      undefined,
    );
    assert.strictEqual(translated.webAuthn, undefined);
  });

  void it('translates external providers without adding passwordless properties', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
      externalProviders: {
        google: {
          clientId: new TestBackendSecret(googleClientId),
          clientSecret: new TestBackendSecret(googleClientSecret),
        },
        callbackUrls: callbackUrls,
        logoutUrls: logoutUrls,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(
      (translated.email as Record<string, unknown>)?.otpLogin,
      undefined,
    );
    assert.strictEqual(translated.webAuthn, undefined);
    assert.ok(translated.externalProviders);
  });

  void it('handles email as boolean without adding otpLogin', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      email: true,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(translated.email, true);
    assert.strictEqual(translated.webAuthn, undefined);
  });

  void it('handles phone as boolean without adding otpLogin', () => {
    const loginWith: AuthLoginWithFactoryProps = {
      phone: true,
    };

    const translated = translateToAuthConstructLoginWith(
      loginWith,
      backendResolver,
    );

    assert.strictEqual(translated.phone, true);
    assert.strictEqual(translated.webAuthn, undefined);
  });
});
