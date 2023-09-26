import {
  BackendSecret,
  UniqueBackendIdentifier,
} from '@aws-amplify/plugin-types';
import { describe, it } from 'node:test';
import {
  AuthFactoryLoginWith,
  translateToAuthConstructLoginWith,
} from './types.js';
import { Construct } from 'constructs';
import {
  BasicLoginOptions,
  ExternalProviders,
  PhoneNumberLogin,
} from '@aws-amplify/auth-construct-alpha';
import { SecretValue } from 'aws-cdk-lib';
import assert from 'node:assert';

class TestBackendSecret implements BackendSecret {
  constructor(private readonly secretName: string) {}
  resolve = (): string => {
    return this.secretName;
  };
}

const phoneNumber: PhoneNumberLogin = {
  verificationMessage: 'text{####}text2',
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

void describe('translateToAuthConstructLoginWith', () => {
  const testStack = {} as Construct;
  const backendIdentifier: UniqueBackendIdentifier = {
    backendId: 'testBackendId',
    branchName: 'testBranchName',
  };

  void it('translates to auth construct', () => {
    const loginWith: AuthFactoryLoginWith = {
      phoneNumber,
      externalProviders: {
        google: {
          clientId: googleClientId,
          clientSecretValue: new TestBackendSecret(googleClientSecret),
        },
        facebook: {
          clientId: facebookClientId,
          clientSecret: new TestBackendSecret(facebookClientSecret),
        },
        amazon: {
          clientId: amazonClientId,
          clientSecret: new TestBackendSecret(amazonClientSecret),
        },
        oidc: {
          clientId: oidcClientId,
          clientSecret: new TestBackendSecret(oidcClientSecret),
          issuerUrl: oidcIssueURL,
        },
        apple: {
          clientId: appleClientId,
          teamId: appleTeamId,
          keyId: appleKeyId,
          privateKey: new TestBackendSecret(applePrivateKey),
        },
        callbackUrls: callbackUrls,
      },
    };

    const translated = translateToAuthConstructLoginWith(
      testStack,
      backendIdentifier,
      loginWith
    );

    const expected: BasicLoginOptions & ExternalProviders = {
      phoneNumber,
      externalProviders: {
        google: {
          clientId: googleClientId,
          clientSecretValue: SecretValue.unsafePlainText(googleClientSecret),
        },
        facebook: {
          clientId: facebookClientId,
          clientSecret: facebookClientSecret,
        },
        amazon: {
          clientId: amazonClientId,
          clientSecret: amazonClientSecret,
        },
        oidc: {
          clientId: oidcClientId,
          clientSecret: oidcClientSecret,
          issuerUrl: oidcIssueURL,
        },
        apple: {
          clientId: appleClientId,
          teamId: appleTeamId,
          keyId: appleKeyId,
          privateKey: applePrivateKey,
        },
        callbackUrls: callbackUrls,
      },
    };
    assert.deepStrictEqual(translated, expected);
  });
});
