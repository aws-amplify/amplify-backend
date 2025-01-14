import { beforeEach, describe, it, mock } from 'node:test';
import assert from 'assert';
import {
  AmplifyReferenceAuth,
  OUTPUT_PROPERTIES_PROVIDED_BY_AUTH_CUSTOM_RESOURCE,
  authOutputKey,
} from './reference_construct.js';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { Template } from 'aws-cdk-lib/assertions';
import { App, Stack } from 'aws-cdk-lib';
import { ReferenceAuthProps } from './reference_factory.js';
const refAuthProps: ReferenceAuthProps = {
  authRoleArn: 'arn:aws:iam::000000000000:role/amplify-sample-auth-role-name',
  unauthRoleArn:
    'arn:aws:iam::000000000000:role/amplify-sample-unauth-role-name',
  identityPoolId: 'us-east-1:identityPoolId',
  userPoolClientId: 'userPoolClientId',
  userPoolId: 'us-east-1_userPoolId',
};

void describe('AmplifyConstruct', () => {
  void it('creates custom resource initializer', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', refAuthProps);
    const template = Template.fromStack(stack);
    // check that custom resource is created with properties
    template.hasResourceProperties('Custom::AmplifyRefAuth', {
      identityPoolId: refAuthProps.identityPoolId,
      userPoolId: refAuthProps.userPoolId,
      userPoolClientId: refAuthProps.userPoolClientId,
    });
  });

  void it('creates policy documents for custom resource', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', refAuthProps);
    const template = Template.fromStack(stack);
    const policyStatements = [
      {
        Action: [
          'cognito-idp:DescribeUserPool',
          'cognito-idp:GetUserPoolMfaConfig',
          'cognito-idp:ListIdentityProviders',
          'cognito-idp:ListGroups',
          'cognito-idp:DescribeUserPoolClient',
        ],
        Effect: 'Allow',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:',
              {
                Ref: 'AWS::Partition',
              },
              ':cognito-idp:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              `:userpool/${refAuthProps.userPoolId}`,
            ],
          ],
        },
      },
      {
        Action: [
          'cognito-identity:DescribeIdentityPool',
          'cognito-identity:GetIdentityPoolRoles',
        ],
        Effect: 'Allow',
        Resource: {
          'Fn::Join': [
            '',
            [
              'arn:aws:cognito-identity:',
              {
                Ref: 'AWS::Region',
              },
              ':',
              {
                Ref: 'AWS::AccountId',
              },
              `:identitypool/${refAuthProps.identityPoolId}`,
            ],
          ],
        },
      },
    ];
    template.hasResourceProperties('AWS::IAM::Policy', {
      PolicyDocument: {
        Statement: policyStatements,
        Version: '2012-10-17',
      },
    });
  });

  void it('generates the correct output values', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyReferenceAuth(stack, 'test', refAuthProps);
    const template = Template.fromStack(stack);
    // check that outputs reference custom resource attributes
    const outputs = template.findOutputs('*');
    for (const property of OUTPUT_PROPERTIES_PROVIDED_BY_AUTH_CUSTOM_RESOURCE) {
      const expectedValue = {
        'Fn::GetAtt': ['AmplifyRefAuthCustomResource', `${property}`],
      };
      assert.ok(outputs[property]);
      const actualValue = outputs[property]['Value'];
      assert.deepEqual(actualValue, expectedValue);
    }
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
              ...OUTPUT_PROPERTIES_PROVIDED_BY_AUTH_CUSTOM_RESOURCE,
            ],
          },
        },
      });
    });
  });
});
