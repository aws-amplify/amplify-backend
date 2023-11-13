import { describe, it } from 'node:test';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './auth_client_config_contributor.js';
import {
  authOutputKey,
  graphqlOutputKey,
} from '@aws-amplify/backend-output-schemas';

void describe('AuthClientConfigContributor', () => {
  void it('returns an empty object if output has no auth output', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [graphqlOutputKey]: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncAdditionalAuthenticationTypes: 'API_KEY',
            awsAppsyncApiKey: 'testApiKey',
            awsAppsyncApiId: 'testApiId',
            amplifyApiModelSchemaS3Uri: 'testApiSchemaUri',
          },
        },
      }),
      {}
    );
  });

  void it('returns translated config when output has auth', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
          },
        },
      }),
      {
        aws_user_pools_id: 'testUserPoolId',
        aws_user_pools_web_client_id: 'testWebClientId',
        aws_cognito_region: 'testRegion',
        aws_cognito_identity_pool_id: 'testIdentityPoolId',
      }
    );
  });

  void it('returns translated config when output has auth with zero-config attributes', () => {
    const contributor = new AuthClientConfigContributor();
    assert.deepStrictEqual(
      contributor.contribute({
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
            passwordPolicyMinLength: '15',
            passwordPolicyRequirements:
              '["REQUIRES_NUMBERS","REQUIRES_LOWERCASE","REQUIRES_UPPERCASE"]',
            mfaTypes: '["SMS","TOTP"]',
            mfaConfiguration: 'OPTIONAL',
            verificationMechanisms: '["EMAIL","PHONE"]',
            usernameAttributes: '["EMAIL"]',
            signupAttributes: '["EMAIL"]',
          },
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
      }
    );
  });
});
