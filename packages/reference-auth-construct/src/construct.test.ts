import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyReferenceAuth, ReferenceAuthProps } from './index.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import assert from 'assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
const refAuthProps: ReferenceAuthProps = {
  authRoleArn:
    'arn:aws:cognito-idp:us-east-1:000000000000:userpool/us-east-1_IDSAMPLE1',
  unauthRoleArn:
    // eslint-disable-next-line spellcheck/spell-checker
    'arn:aws:cognito-identity:us-east-1:000000000000:identitypool/us-east-1:00000000-abcd-efgh-ijkl-000000000000',
  identityPoolId: 'identityPoolId',
  userPoolClientId: 'userPoolClientId',
  userPoolId: 'userPoolId',
};
void describe('AmplifyConstruct', () => {
  // beforeEach(() => {

  // })
  void it('creates custom resource initializer', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', refAuthProps);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const template = Template.fromStack(stack);
    // check that custom resource is created with properties
    template.hasResourceProperties(
      'Custom::AmplifyReferenceAuthConfigurationResource',
      {
        identityPoolId: 'identityPoolId',
        userPoolId: 'userPoolId',
        userPoolClientId: 'userPoolClientId',
      }
    );
    // check custom resource lambda provider permissions

    // check custom resource lambda permissions
  });

  void it('generates the correct output values', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', refAuthProps);
    const template = Template.fromStack(stack);
    // check that outputs reference custom resource attributes
    const outputs = template.findOutputs('*');
    const allowUnauthenticatedIdentitiesRef =
      outputs['allowUnauthenticatedIdentities']['Value'];
    assert.deepEqual(
      {
        'Fn::GetAtt': [
          'AmplifyRefAuthConfigCustomResource',
          'allowUnauthenticatedIdentities',
        ],
      },
      allowUnauthenticatedIdentitiesRef
    );
  });

  void describe('storeOutput strategy', () => {
    let app: App;
    let stack: Stack;
    const storeOutputMock = mock.fn();
    const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
      {
        addBackendOutputEntry: storeOutputMock,
        appendToBackendOutputList: storeOutputMock,
      };

    void beforeEach(() => {
      app = new App();
      stack = new Stack(app);
      storeOutputMock.mock.resetCalls();
    });

    void it('stores output using custom strategy and basic props', () => {
      const authConstruct = new AmplifyReferenceAuth(stack, 'test', {
        ...refAuthProps,
        outputStorageStrategy: stubBackendOutputStorageStrategy,
      });

      const expectedUserPoolId = authConstruct.resources.userPool.userPoolId;
      const expectedIdentityPoolId = authConstruct.resources.identityPoolId;
      const expectedWebClientId =
        authConstruct.resources.userPoolClient.userPoolClientId;
      const expectedRegion = Stack.of(authConstruct).region;

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.equal(storeOutputArgs.length, 2);
      assert.equal(storeOutputArgs[0], authOutputKey);
      assert.equal(storeOutputArgs[1]['version'], '1');
      const payload = storeOutputArgs[1]['payload'];
      assert.equal(payload['userPoolId'], expectedUserPoolId);
      assert.equal(payload['identityPoolId'], expectedIdentityPoolId);
      assert.equal(payload['webClientId'], expectedWebClientId);
      assert.equal(payload['authRegion'], expectedRegion);
    });

    void it('stores output when no storage strategy is injected', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyReferenceAuth(stack, 'test', refAuthProps);

      const template = Template.fromStack(stack);
      template.templateMatches({
        Metadata: {
          [authOutputKey]: {
            version: '1',
            stackOutputs: [
              'userPoolId',
              'webClientId',
              'identityPoolId',
              'authRegion',
              'allowUnauthenticatedIdentities',
              // 'signupAttributes',
              // 'usernameAttributes',
              // 'verificationMechanisms',
              // 'passwordPolicyMinLength',
              // 'passwordPolicyRequirements',
              // 'mfaConfiguration',
              // 'mfaTypes',
              // 'socialProviders',
              // 'oauthCognitoDomain',
              // 'oauthScope',
              // 'oauthRedirectSignIn',
              // 'oauthRedirectSignOut',
              // 'oauthResponseType',
              // 'oauthClientId',
            ],
          },
        },
      });
    });
  });
});
