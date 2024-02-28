import { describe, it, mock } from 'node:test';
import { UnifiedClientConfigGenerator } from './unified_client_config_generator.js';
import assert from 'node:assert';
import {
  UnifiedBackendOutput,
  authOutputKey,
  customOutputKey,
  graphqlOutputKey,
  platformOutputKey,
} from '@aws-amplify/backend-output-schemas';
import { ClientConfig } from './client-config-types/client_config.js';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import { ModelIntrospectionSchemaAdapter } from './model_introspection_schema_adapter.js';
import { AmplifyUserError } from '@aws-amplify/platform-core';
import { ClientConfigContributorFactory } from './client-config-contributor-gen2/client_config_contributor_factory.js';
import { AwsRegion } from './client-config-schema/client_config_v2.js';
import {
  AuthorizationType,
  MfaConfiguration,
  MfaMethod,
  PasswordPolicyCharacter,
  UserUsernameAttribute,
  UserVerificationMechanism,
} from './client-config-schema/client_config_v1.js';

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
            authRegion: 'us-east-1',
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
      const configContributors = new ClientConfigContributorFactory(
        modelSchemaAdapter
      ).getContributors('1');
      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      const result = await clientConfigGenerator.generateClientConfig();
      const expectedClientConfig: ClientConfig = {
        auth: {
          user_pool_id: 'testUserPoolId',
          aws_region: AwsRegion.UsEast1,
          user_pool_client_id: 'testWebClientId',
          identity_pool_id: 'testIdentityPoolId',
          mfa_methods: [MfaMethod.SMS, MfaMethod.Totp],
          user_sign_up_attributes: [
            UserUsernameAttribute.Email.toUpperCase() as UserUsernameAttribute,
          ],
          user_username_attributes: [
            UserUsernameAttribute.Email.toUpperCase() as UserUsernameAttribute,
          ],
          user_verification_mechanisms: [
            UserVerificationMechanism.Email.toUpperCase() as UserVerificationMechanism,
            UserVerificationMechanism.Phone.toUpperCase() as UserVerificationMechanism,
          ],
          mfa_configuration: MfaConfiguration.Optional,
          password_policy_min_length: 8,
          password_policy_characters: [
            PasswordPolicyCharacter.RequiresNumbers,
            PasswordPolicyCharacter.RequiresLowercase,
            PasswordPolicyCharacter.RequiresUppercase,
          ],
        },
        data: {
          url: 'testApiEndpoint',
          aws_region: AwsRegion.UsEast1,
          api_key: 'testApiKey',
          default_authorization_type: 'API_KEY',
          authorization_types: [AuthorizationType.APIKey],
        },
        version: '1',
      };

      // aws_appsync_conflictResolutionMode: undefined,
      // allowUnauthenticatedIdentities: 'true',
      assert.deepStrictEqual(result, expectedClientConfig);
    });

    void it('throws user error if there are overlapping values', async () => {
      const customOutputs: Partial<ClientConfig> = {
        auth: { user_pool_id: 'overrideUserPoolId' },
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
      const modelSchemaAdapter = new ModelIntrospectionSchemaAdapter(
        fromNodeProviderChain()
      );

      mock.method(
        modelSchemaAdapter,
        'getModelIntrospectionSchemaFromS3Uri',
        () => undefined
      );
      const configContributors = new ClientConfigContributorFactory(
        modelSchemaAdapter
      ).getContributors('1');

      const clientConfigGenerator = new UnifiedClientConfigGenerator(
        outputRetrieval,
        configContributors
      );
      await assert.rejects(
        () => clientConfigGenerator.generateClientConfig(),
        (error: AmplifyUserError) => {
          assert.strictEqual(
            error.message,
            'Duplicated entry with key user_pool_id detected in deployment outputs'
          );
          assert.ok(error.resolution);
          return true;
        }
      );
    });
  });
});
