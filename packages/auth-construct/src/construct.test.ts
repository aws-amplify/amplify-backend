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
  CfnIdentityPool,
  CfnUserPool,
  CfnUserPoolClient,
  UserPool,
  UserPoolClient,
  VerificationEmailStyle,
} from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { AuthProps } from './types.js';

describe('Auth construct', () => {
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

  it('creates email login mechanism if settings is empty object', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { email: {} } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  it('creates phone login mechanism if settings is empty object', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { phoneNumber: {} } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
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

  it('creates email login mechanism with MFA', () => {
    const app = new App();
    const stack = new Stack(app);
    const customEmailVerificationMessage = 'custom email body {####}';
    const customEmailVerificationSubject = 'custom subject';
    const smsVerificationMessage = 'the verification code is {####}';
    const smsAuthenticationMessage = 'SMS MFA code is {####}';
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: {
          emailBody: customEmailVerificationMessage,
          emailStyle: VerificationEmailStyle.CODE,
          emailSubject: customEmailVerificationSubject,
        },
        phoneNumber: {
          verificationMessage: smsVerificationMessage,
        },
      },
      multifactor: {
        enforcementType: 'OPTIONAL',
        sms: true,
        smsMessage: smsAuthenticationMessage,
        totp: false,
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
        SmsMessage: smsVerificationMessage,
      },
      MfaConfiguration: 'OPTIONAL',
      EnabledMfas: ['SMS_MFA'],
      SmsAuthenticationMessage: smsAuthenticationMessage,
      SmsVerificationMessage: smsVerificationMessage,
    });
  });

  it('expect compile error if invalid email verification message for CODE', () => {
    const customEmailVerificationMessage = 'invalid message without code';
    const validMessage = 'valid {####} email';
    const customEmailVerificationSubject = 'custom subject';
    let props: AuthProps = {
      loginWith: {
        email: {
          // @ts-expect-error We know this is a compile error, but must have runtime validation as well.
          emailBody: customEmailVerificationMessage,
          emailStyle: VerificationEmailStyle.CODE,
          emailSubject: customEmailVerificationSubject,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
    props = {
      loginWith: {
        email: {
          emailBody: validMessage,
          emailStyle: VerificationEmailStyle.CODE,
          emailSubject: customEmailVerificationSubject,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
  });

  it('expect compile error if invalid email verification message for LINK', () => {
    const customEmailVerificationMessage = 'invalid message without link';
    const validMessage = 'valid {##Verify Email##}';
    const customEmailVerificationSubject = 'custom subject';
    let props: AuthProps = {
      loginWith: {
        email: {
          // @ts-expect-error We expect this to be a compile error
          emailBody: customEmailVerificationMessage,
          emailStyle: VerificationEmailStyle.LINK,
          emailSubject: customEmailVerificationSubject,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
    props = {
      loginWith: {
        email: {
          emailBody: validMessage,
          emailStyle: VerificationEmailStyle.LINK,
          emailSubject: customEmailVerificationSubject,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
  });

  it('does not throw if valid email verification message for LINK', () => {
    const app = new App();
    const stack = new Stack(app);
    const customEmailVerificationMessage =
      'valid message {##Verify Email##} with link';
    const customEmailVerificationSubject = 'custom subject';
    assert.doesNotThrow(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              emailBody: customEmailVerificationMessage,
              emailStyle: VerificationEmailStyle.LINK,
              emailSubject: customEmailVerificationSubject,
            },
          },
        })
    );
  });

  it('expect compile error if invalid sms verification message', () => {
    const customSMSVerificationMessage = 'invalid message without code';
    const validSMSVerificationMessage = 'valid {####}';
    let props: AuthProps = {
      loginWith: {
        phoneNumber: {
          // @ts-expect-error We expect this to be a compile error
          verificationMessage: customSMSVerificationMessage,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
    props = {
      loginWith: {
        phoneNumber: {
          verificationMessage: validSMSVerificationMessage,
        },
      },
    };
    // bypass ts unused props warning
    assert.notEqual(props, undefined);
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

  it('throws if duplicate custom attributes are found', () => {
    const app = new App();
    const stack = new Stack(app);
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: { email: true },
          userAttributes: [
            AmplifyAuth.customAttribute.string('myCustomAttribute'),
            AmplifyAuth.customAttribute.string('myCustomAttribute'),
          ],
        }),
      {
        message: `Invalid userAttributes. Duplicate custom attribute name found: myCustomAttribute.`,
      }
    );
  });

  it('throws if duplicate user attributes are found', () => {
    const app = new App();
    const stack = new Stack(app);
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: { email: true },
          userAttributes: [
            AmplifyAuth.attribute('address').mutable(),
            AmplifyAuth.attribute('address').required(),
          ],
        }),
      {
        message: `Invalid userAttributes. Duplicate attribute name found: address.`,
      }
    );
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
      const expectedIdentityPoolId = (
        authConstruct.node.findChild('IdentityPool') as CfnIdentityPool
      ).ref;
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
            identityPoolId: expectedIdentityPoolId,
            authRegion: expectedRegion,
          },
        },
      ]);
    });
  });

  describe('defaults', () => {
    it('creates email login by default', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
    });

    it('creates the correct number of default resources', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.resourceCountIs('AWS::Cognito::UserPool', 1);
      template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
      template.resourceCountIs('AWS::Cognito::IdentityPool', 1);
      template.resourceCountIs('AWS::Cognito::IdentityPoolRoleAttachment', 1);
      template.resourceCountIs('AWS::IAM::Role', 2);
    });

    it('sets the case sensitivity to false', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameConfiguration: {
          CaseSensitive: false,
        },
      });
    });

    it('enables self signup', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: false,
        },
      });
    });

    it('allows unauthenticated identities to the identity pool', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        AllowUnauthenticatedIdentities: true,
      });
    });

    it('prevents user existence errors', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
      });
    });

    it('sets the default password policy', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 8,
            RequireLowercase: true,
            RequireNumbers: true,
            RequireSymbols: true,
            RequireUppercase: true,
          },
        },
      });
    });

    it('require verification of email before updating email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserAttributeUpdateSettings: {
          AttributesRequireVerificationBeforeUpdate: ['email'],
        },
      });
    });

    it('enables SRP and Custom auth flows', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        ExplicitAuthFlows: [
          'ALLOW_CUSTOM_AUTH',
          'ALLOW_USER_SRP_AUTH',
          'ALLOW_REFRESH_TOKEN_AUTH',
        ],
      });
    });

    it('creates a default client with cognito provider', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: ['COGNITO'],
      });
    });
  });

  describe('Auth overrides', () => {
    it('can override case sensitivity', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      const userPoolResource = auth.resources.userPool.node.findChild(
        'Resource'
      ) as CfnUserPool;
      userPoolResource.addPropertyOverride(
        'UsernameConfiguration.CaseSensitive',
        true
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameConfiguration: {
          CaseSensitive: true,
        },
      });
    });
    it('can override setting to keep original attributes until verified', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test', {
        loginWith: { email: true },
      });
      const userPoolResource = auth.resources.userPool.node.findChild(
        'Resource'
      ) as CfnUserPool;
      userPoolResource.addPropertyOverride(
        'UserAttributeUpdateSettings.AttributesRequireVerificationBeforeUpdate',
        []
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UserAttributeUpdateSettings: {
          AttributesRequireVerificationBeforeUpdate: [],
        },
      });
    });
    it('can override settings for device configuration', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test', {
        loginWith: { email: true },
      });
      const userPoolResource = auth.resources.userPool.node.findChild(
        'Resource'
      ) as CfnUserPool;
      userPoolResource.addPropertyOverride(
        'DeviceConfiguration.ChallengeRequiredOnNewDevice',
        true
      );
      userPoolResource.addPropertyOverride(
        'DeviceConfiguration.DeviceOnlyRememberedOnUserPrompt',
        true
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        DeviceConfiguration: {
          ChallengeRequiredOnNewDevice: true,
          DeviceOnlyRememberedOnUserPrompt: true,
        },
      });
    });
    it('can override password policy', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      const userPoolResource = auth.resources.userPool.node.findChild(
        'Resource'
      ) as CfnUserPool;
      userPoolResource.addPropertyOverride(
        'Policies.PasswordPolicy.MinimumLength',
        10
      );
      userPoolResource.addPropertyOverride(
        'Policies.PasswordPolicy.RequireLowercase',
        false
      );
      userPoolResource.addPropertyOverride(
        'Policies.PasswordPolicy.RequireNumbers',
        false
      );
      userPoolResource.addPropertyOverride(
        'Policies.PasswordPolicy.RequireSymbols',
        false
      );
      userPoolResource.addPropertyOverride(
        'Policies.PasswordPolicy.RequireUppercase',
        false
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        Policies: {
          PasswordPolicy: {
            MinimumLength: 10,
            RequireLowercase: false,
            RequireNumbers: false,
            RequireSymbols: false,
            RequireUppercase: false,
          },
        },
      });
    });
    it('can override user existence errors', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      const userPoolClientResource =
        auth.resources.userPoolClient.node.findChild(
          'Resource'
        ) as CfnUserPoolClient;
      userPoolClientResource.addPropertyOverride(
        'PreventUserExistenceErrors',
        'LEGACY'
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'LEGACY',
      });
    });
    it('can override guest access setting', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      auth.resources.cfnResources.identityPool.addPropertyOverride(
        'AllowUnauthenticatedIdentities',
        false
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        AllowUnauthenticatedIdentities: false,
      });
    });
    it('can override token validity period', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      const userPoolClientResource =
        auth.resources.userPoolClient.node.findChild(
          'Resource'
        ) as CfnUserPoolClient;
      userPoolClientResource.addPropertyOverride('AccessTokenValidity', 1);
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        AccessTokenValidity: 1,
      });
    });
  });
});
