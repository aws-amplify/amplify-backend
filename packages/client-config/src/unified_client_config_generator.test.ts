import { describe, it, mock } from 'node:test';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import assert from 'node:assert';
import { AuthClientConfigContributor } from './client-config-contributor/auth_client_config_contributor.js';
import { GraphqlClientConfigContributor } from './client-config-contributor/graphql_client_config_contributor.js';
import {
  UnifiedBackendOutput,
  authOutputKey,
  customOutputKey,
  graphqlOutputKey,
  platformOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ModelIntrospectionSchemaAdapter } from './client-config-contributor/model_introspection_schema_adapater.js';
import { PlatformClientConfigContributor } from './client-config-contributor/platform_client_config_contributor.js';
import { CustomClientConfigContributor } from './client-config-contributor/custom_client_config_contributor.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';

void describe('UnifiedClientConfigGenerator', () => {
  void describe('generateClientConfig', () => {
    void it('transforms backend output into client config', async () => {
      const stubOutput: UnifiedBackendOutput = {
        [platformOutputKey]: {
          version: '1',
          payload: {
            deploymentType: 'branch',
            region: 'us-east-1',
          },
        },
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
            passwordPolicyMinLength: '8',
            passwordPolicyRequirements:
              '["REQUIRES_NUMBERS","REQUIRES_LOWERCASE","REQUIRES_UPPERCASE"]',
            mfaTypes: '["SMS","TOTP"]',
            mfaConfiguration: 'OPTIONAL',
            verificationMechanisms: '["EMAIL","PHONE"]',
            usernameAttributes: '["EMAIL"]',
            signupAttributes: '["EMAIL"]',
            allowUnauthenticatedIdentities: 'true',
          },
        },
        [graphqlOutputKey]: {
          version: '1',
          payload: {
            awsAppsyncApiEndpoint: 'testApiEndpoint',
            awsAppsyncRegion: 'us-east-1',
            awsAppsyncAuthenticationType: 'API_KEY',
            awsAppsyncAdditionalAuthenticationTypes: 'API_KEY',
            awsAppsyncConflictResolutionMode: undefined,
            awsAppsyncApiKey: 'testApiKey',
            awsAppsyncApiId: 'testApiId',
            amplifyApiModelSchemaS3Uri: 'testApiSchemaUri',
          },
        },
      };
      const outputRetrieval = mock.fn(async () => stubOutput);
      const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
        fromNodeProviderChain()
      );

      mock.method(
        modelSchemaAdapter,
        'getModelIntrospectionSchemaFromS3Uri',
        () => undefined
      );
      const configContributors = [
        new PlatformClientConfigContributor(),
        new AuthClientConfigContributor(),
        new GraphqlClientConfigContributor(modelSchemaAdapter),
      ];

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      const result = await clientConfigGenerator.generateClientConfig();
      const expectedClientConfig: ClientConfig = {
        aws_project_region: 'us-east-1',
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
          passwordPolicyMinLength: 8,
        },
        aws_cognito_signup_attributes: ['EMAIL'],
        aws_cognito_username_attributes: ['EMAIL'],
        aws_cognito_verification_mechanisms: ['EMAIL', 'PHONE'],
        aws_appsync_apiKey: 'testApiKey',
        aws_appsync_authenticationType: 'API_KEY',
        aws_appsync_conflictResolutionMode: undefined,
        aws_appsync_graphqlEndpoint: 'testApiEndpoint',
        aws_appsync_region: 'us-east-1',
        aws_appsync_additionalAuthenticationTypes: 'API_KEY',
        allowUnauthenticatedIdentities: 'true',
      };
      assert.deepStrictEqual(result, expectedClientConfig);
    });

    void it('throws user error if there are overlapping values', async () => {
      const customOutputs: Partial<ClientConfig> = {
        aws_user_pools_id: 'overrideUserPoolId',
      };
      const stubOutput: UnifiedBackendOutput = {
        [authOutputKey]: {
          version: '1',
          payload: {
            identityPoolId: 'testIdentityPoolId',
            userPoolId: 'testUserPoolId',
            webClientId: 'testWebClientId',
            authRegion: 'testRegion',
          },
        },
        [customOutputKey]: {
          version: '1',
          payload: {
            customOutputs: JSON.stringify(customOutputs),
          },
        },
      };
      const outputRetrieval = mock.fn(async () => stubOutput);
      const configContributors = [
        new AuthClientConfigContributor(),
        new CustomClientConfigContributor(),
      ];

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      await assert.rejects(
        () => clientConfigGenerator.generateClientConfig(),
        (error: AmplifyUserError) => {
          assert.strictEqual(
            error.message,
            'Duplicated entry with key aws_user_pools_id detected in deployment outputs'
          );
          assert.ok(error.resolution);
          return true;
        }
      );
    });
  });
});
