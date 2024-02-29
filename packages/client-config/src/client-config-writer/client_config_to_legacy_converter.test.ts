import { describe, it } from 'node:test';
import { ClientConfigLegacyConverter } from './client_config_to_legacy_converter.js';
import assert from 'node:assert';
import { ClientConfigLegacy } from '../index.js';
import { AmplifyFault } from '@aws-amplify/platform-core';

void describe('ClientConfigLegacyConverter', () => {
  void it('throw if unsupported version of client config is passed', () => {
    const converter = new ClientConfigLegacyConverter();
    assert.throws(
      () =>
        converter.convertToLegacyConfig({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          version: '3' as any, // Force feed version 3 as versions are strongly typed and 3 may not even exist
        }),
      new AmplifyFault('UnsupportedClientConfigVersion', {
        message: 'Only version 1 of ClientConfig is supported.',
      })
    );
  });

  void it('returns translated legacy config for auth', () => {
    const converter = new ClientConfigLegacyConverter();
    assert.deepStrictEqual(
      converter.convertToLegacyConfig({
        version: '1',
        auth: {
          identity_pool_id: 'testIdentityPoolId',
          user_pool_id: 'testUserPoolId',
          user_pool_client_id: 'testWebClientId',
          aws_region: 'testRegion',
          password_policy: {
            min_length: 15,
            require_lowercase: true,
            require_numbers: true,
            require_uppercase: true,
          },
          mfa_methods: ['SMS', 'TOTP'],
          mfa_configuration: 'OPTIONAL',
          user_verification_mechanisms: ['EMAIL', 'PHONE'],
          username_attributes: ['EMAIL'],
          standard_attributes: { EMAIL: { required: true } },
          unauthenticated_identities_enabled: true,
          oauth_domain: 'testDomain',
          oauth_scope: ['email', 'profile'],
          oauth_redirect_sign_in: [
            'http://callback.com',
            'http://callback2.com',
          ],
          oauth_redirect_sign_out: ['http://logout.com', 'http://logout2.com'],
          oauth_response_type: 'code',
          identity_providers: ['provider1', 'provider2'],
        },
      }),
      {
        aws_user_pools_id: 'testUserPoolId',
        aws_user_pools_web_client_id: 'testWebClientId',
        aws_cognito_region: 'testRegion',
        aws_cognito_identity_pool_id: 'testIdentityPoolId',
        aws_cognito_mfa_configuration: 'OPTIONAL',
        aws_cognito_mfa_types: ['SMS', 'TOTP'],
        aws_cognito_password_protection_settings: {
          passwordPolicyCharacters: [
            'REQUIRES_NUMBERS',
            'REQUIRES_LOWERCASE',
            'REQUIRES_UPPERCASE',
          ],
          passwordPolicyMinLength: 15,
        },
        aws_cognito_signup_attributes: ['EMAIL'],
        aws_cognito_username_attributes: ['EMAIL'],
        aws_cognito_verification_mechanisms: ['EMAIL', 'PHONE'],
        allowUnauthenticatedIdentities: 'true',
        oauth: {
          domain: 'testDomain',
          scope: ['email', 'profile'],
          redirectSignIn: 'http://callback.com,http://callback2.com',
          redirectSignOut: 'http://logout.com,http://logout2.com',
          responseType: 'code',
        },
        aws_cognito_social_providers: ['provider1', 'provider2'],
      } as ClientConfigLegacy
    );
  });

  //TBD for custom and other categories
});
