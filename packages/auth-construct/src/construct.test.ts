import { describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import {
  UserPool,
  UserPoolClient,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';

describe.only('Auth construct', () => {
  it('creates phone number login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { phoneNumber: true } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
    });
  });

  it('creates email login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { email: true } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('creates email login mechanism with specific settings', () => {
    const app = new App();
    const stack = new Stack(app);
    const customEmailVerificationMessage = 'custom email body {####}';
    const customEmailVerificationSubject = 'custom subject';
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: {
          emailBody: customEmailVerificationMessage,
          emailStyle: VerificationEmailStyle.CODE,
          emailSubject: customEmailVerificationSubject,
        },
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      EmailVerificationMessage: customEmailVerificationMessage,
      EmailVerificationSubject: customEmailVerificationSubject,
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_CODE',
        EmailMessage: customEmailVerificationMessage,
        EmailSubject: customEmailVerificationSubject,
        SmsMessage: 'The verification code to your new account is {####}',
      },
    });
  });

  it('throws error if invalid email verification message for CODE', () => {
    const app = new App();
    const stack = new Stack(app);
    const customEmailVerificationMessage = 'invalid message without code';
    const customEmailVerificationSubject = 'custom subject';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              emailBody: customEmailVerificationMessage,
              emailStyle: VerificationEmailStyle.CODE,
              emailSubject: customEmailVerificationSubject,
            },
          },
        }),
      {
        message:
          "Invalid email settings. Property 'emailBody' must contain a template for the validation code with a format of {####}.",
      }
    );
  });

  it('throws error if invalid email verification message for LINK', () => {
    const app = new App();
    const stack = new Stack(app);
    const customEmailVerificationMessage = 'invalid message without link';
    const customEmailVerificationSubject = 'custom subject';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              emailBody: customEmailVerificationMessage,
              emailStyle: VerificationEmailStyle.LINK,
              emailSubject: customEmailVerificationSubject,
            },
          },
        }),
      {
        message:
          "Invalid email settings. Property 'emailBody' must contain a template for the validation link with a format of {##Verify Email##}.",
      }
    );
  });

  it('throws error if invalid sms verification message', () => {
    const app = new App();
    const stack = new Stack(app);
    const customSMSVerificationMessage = 'invalid message without code';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            phoneNumber: {
              verificationMessage: customSMSVerificationMessage,
            },
          },
        }),
      {
        message:
          "Invalid phoneNumber settings. Property 'verificationMessage' must contain a template for the validation code with a format of {####}.",
      }
    );
  });

  it('requires email attribute if email is enabled', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { email: true } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Schema: [
        {
          Mutable: true,
          Name: 'email',
          Required: true,
        },
      ],
    });
  });

  it('creates user attributes', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: { email: true },
      userAttributes: [
        AmplifyAuth.attribute('address').mutable(),
        AmplifyAuth.attribute('familyName').required(),
        AmplifyAuth.customAttribute.string('defaultString'),
        AmplifyAuth.customAttribute
          .string('minMaxString')
          .minLength(0)
          .maxLength(100),
        AmplifyAuth.customAttribute.dateTime('birthDateTime'),
        AmplifyAuth.customAttribute.number('numberMinMax').min(0).max(5),
      ],
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      Schema: [
        {
          Mutable: true,
          Name: 'email',
          Required: true,
        },
        {
          Mutable: true,
          Name: 'address',
          Required: false,
        },
        {
          Mutable: false,
          Name: 'family_name',
          Required: true,
        },
        {
          AttributeDataType: 'String',
          Mutable: false,
          Name: 'defaultString',
          StringAttributeConstraints: {},
        },
        {
          AttributeDataType: 'String',
          Mutable: false,
          Name: 'minMaxString',
          StringAttributeConstraints: {
            MinLength: '0',
            MaxLength: '100',
          },
        },
        {
          AttributeDataType: 'DateTime',
          Mutable: false,
          Name: 'birthDateTime',
        },
        {
          AttributeDataType: 'Number',
          Mutable: false,
          Name: 'numberMinMax',
          NumberAttributeConstraints: {
            MaxValue: '5',
            MinValue: '0',
          },
        },
      ],
    });
  });

  describe('storeOutput', () => {
    it('stores outputs in platform', () => {
      const app = new App();
      const stack = new Stack(app);

      const storeOutputMock = mock.fn();
      const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
        {
          addBackendOutputEntry: storeOutputMock,
          flush: mock.fn(),
        };
      const authConstruct = new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
        },
      });

      const expectedUserPoolId = (
        authConstruct.node.findChild('UserPool') as UserPool
      ).userPoolId;
      const expectedWebClientId = (
        authConstruct.node.findChild('UserPoolWebClient') as UserPoolClient
      ).userPoolClientId;
      const expectedRegion = Stack.of(authConstruct).region;

      authConstruct.storeOutput(stubBackendOutputStorageStrategy);

      const storeOutputArgs = storeOutputMock.mock.calls[0].arguments;
      assert.equal(storeOutputArgs.length, 2);

      assert.deepStrictEqual(storeOutputArgs, [
        authOutputKey,
        {
          version: '1',
          payload: {
            userPoolId: expectedUserPoolId,
            webClientId: expectedWebClientId,
            authRegion: expectedRegion,
          },
        },
      ]);
    });
  });
});
