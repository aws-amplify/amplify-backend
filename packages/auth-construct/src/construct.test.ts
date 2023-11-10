import { describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  AmplifyFunction,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import {
  CfnIdentityPool,
  CfnUserPoolClient,
  UserPool,
  UserPoolClient,
  UserPoolIdentityProviderSamlMetadataType,
} from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { Code, Function, Runtime } from 'aws-cdk-lib/aws-lambda';

const googleClientId = 'googleClientId';
const googleClientSecret = 'googleClientSecret';
const amazonClientId = 'amazonClientId';
const amazonClientSecret = 'amazonClientSecret';
const appleClientId = 'appleClientId';
const applePrivateKey = 'applePrivateKey';
const appleTeamId = 'team';
const appleKeyId = 'key';
const facebookClientId = 'facebookClientId';
const facebookClientSecret = 'facebookClientSecret';
const oidcClientId = 'oidcClientId';
const oidcClientSecret = 'oidcClientSecret';
const oidcIssuerUrl = 'https://mysampleoidcissuer.com';
const oidcProviderName = 'myOidcProvider';
const ExpectedGoogleIDPProperties = {
  ProviderDetails: {
    authorize_scopes: 'profile',
    client_id: googleClientId,
    client_secret: googleClientSecret,
  },
  ProviderName: 'Google',
  ProviderType: 'Google',
};
const ExpectedFacebookIDPProperties = {
  ProviderDetails: {
    authorize_scopes: 'public_profile',
    client_id: facebookClientId,
    client_secret: facebookClientSecret,
  },
  ProviderName: 'Facebook',
  ProviderType: 'Facebook',
};
const ExpectedAppleIDPProperties = {
  ProviderDetails: {
    authorize_scopes: 'name',
    client_id: appleClientId,
    key_id: appleKeyId,
    private_key: applePrivateKey,
    team_id: appleTeamId,
  },
  ProviderName: 'SignInWithApple',
  ProviderType: 'SignInWithApple',
};
const ExpectedAmazonIDPProperties = {
  ProviderDetails: {
    authorize_scopes: 'profile',
    client_id: amazonClientId,
    client_secret: amazonClientSecret,
  },
  ProviderName: 'LoginWithAmazon',
  ProviderType: 'LoginWithAmazon',
};
const ExpectedOidcIDPProperties = {
  ProviderDetails: {
    attributes_request_method: 'GET',
    authorize_scopes: 'openid',
    client_id: oidcClientId,
    client_secret: oidcClientSecret,
    oidc_issuer: oidcIssuerUrl,
  },
  ProviderName: oidcProviderName,
  ProviderType: 'OIDC',
};
const samlProviderName = 'samlProviderName';
const samlMetadataContent = '<?xml version=".10"?>';
const ExpectedSAMLIDPProperties = {
  ProviderDetails: {
    IDPSignout: false,
    MetadataFile: samlMetadataContent,
  },
  ProviderName: samlProviderName,
  ProviderType: 'SAML',
};
void describe('Auth construct', () => {
  void it('creates phone number login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { phone: true } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
    });
  });

  void it('creates email login mechanism', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { email: true } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  void it('creates email login mechanism if settings is empty object', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { email: {} } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
  });

  void it('creates phone login mechanism if settings is empty object', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', { loginWith: { phone: {} } });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['phone_number'],
      AutoVerifiedAttributes: ['phone_number'],
    });
  });

  void it('throws error login settings do not include at least phone or email', () => {
    const app = new App();
    const stack = new Stack(app);
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {},
        }),
      {
        message: 'At least one of email or phone must be enabled.',
      }
    );
  });

  void it('creates email login mechanism with specific settings', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = (code: string) => `custom email body ${code}`;
    const expectedEmailMessage = 'custom email body {####}';
    const customEmailVerificationSubject = 'custom subject';
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: {
          verificationEmailBody: emailBodyFunction,
          verificationEmailStyle: 'CODE',
          verificationEmailSubject: customEmailVerificationSubject,
        },
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      EmailVerificationMessage: expectedEmailMessage,
      EmailVerificationSubject: customEmailVerificationSubject,
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_CODE',
        EmailMessage: expectedEmailMessage,
        EmailSubject: customEmailVerificationSubject,
        SmsMessage: 'The verification code to your new account is {####}',
      },
    });
  });

  void it('creates email login mechanism with MFA', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = (code: string) => `custom email body ${code}`;
    const expectedEmailMessage = 'custom email body {####}';
    const customEmailVerificationSubject = 'custom subject';
    const smsVerificationMessageFunction = (code: string) =>
      `the verification code is ${code}`;
    const expectedSMSVerificationMessage = 'the verification code is {####}';
    const smsMFAMessageFunction = (code: string) => `SMS MFA code is ${code}`;
    const expectedSMSMFAMessage = 'SMS MFA code is {####}';
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: {
          verificationEmailBody: emailBodyFunction,
          verificationEmailStyle: 'CODE',
          verificationEmailSubject: customEmailVerificationSubject,
        },
        phone: {
          verificationMessage: smsVerificationMessageFunction,
        },
      },
      multifactor: {
        mode: 'OPTIONAL',
        sms: {
          smsMessage: smsMFAMessageFunction,
        },
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      EmailVerificationMessage: expectedEmailMessage,
      EmailVerificationSubject: customEmailVerificationSubject,
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_CODE',
        EmailMessage: expectedEmailMessage,
        EmailSubject: customEmailVerificationSubject,
        SmsMessage: expectedSMSVerificationMessage,
      },
      MfaConfiguration: 'OPTIONAL',
      EnabledMfas: ['SMS_MFA'],
      SmsAuthenticationMessage: expectedSMSMFAMessage,
      SmsVerificationMessage: expectedSMSVerificationMessage,
    });
  });

  void it('throws error if invalid email verification message for CODE', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = () => 'invalid message without code';
    const customEmailVerificationSubject = 'custom subject';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              verificationEmailBody: emailBodyFunction,
              verificationEmailStyle: 'CODE',
              verificationEmailSubject: customEmailVerificationSubject,
            },
          },
        }),
      {
        message:
          "Invalid email settings. Property 'verificationEmailBody' must utilize the 'code' parameter at least once as a placeholder for the verification code.",
      }
    );
  });

  void it('throws error if invalid email verification message for LINK', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = () => 'invalid message without link';
    const customEmailVerificationSubject = 'custom subject';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              verificationEmailBody: emailBodyFunction,
              verificationEmailStyle: 'LINK',
              verificationEmailSubject: customEmailVerificationSubject,
            },
          },
        }),
      {
        message:
          "Invalid email settings. Property 'verificationEmailBody' must utilize the 'link' parameter at least once as a placeholder for the verification link.",
      }
    );
  });

  void it('does not throw if valid email verification message for LINK', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = (link: string) =>
      `valid message ${link} with link`;
    const customEmailVerificationSubject = 'custom subject';
    assert.doesNotThrow(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: {
              verificationEmailBody: emailBodyFunction,
              verificationEmailStyle: 'LINK',
              verificationEmailSubject: customEmailVerificationSubject,
            },
          },
        })
    );
  });

  void it('throws error if invalid sms verification message', () => {
    const app = new App();
    const stack = new Stack(app);
    const smsVerificationMessageFunction = () => 'invalid message without code';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            phone: {
              verificationMessage: smsVerificationMessageFunction,
            },
          },
        }),
      {
        message:
          "Invalid phone settings. Property 'verificationMessage' must utilize the 'code' parameter at least once as a placeholder for the verification code.",
      }
    );
  });

  void it('does not throw error if valid MFA message', () => {
    const app = new App();
    const stack = new Stack(app);
    const validMFAMessage = (code: string) => `valid MFA message with ${code}`;
    assert.doesNotThrow(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: true,
          },
          multifactor: {
            mode: 'OPTIONAL',
            sms: {
              smsMessage: validMFAMessage,
            },
            totp: false,
          },
        })
    );
  });

  void it('throws error if invalid MFA message', () => {
    const app = new App();
    const stack = new Stack(app);
    const invalidMFAMessage = () => 'invalid MFA message without code';
    assert.throws(
      () =>
        new AmplifyAuth(stack, 'test', {
          loginWith: {
            email: true,
          },
          multifactor: {
            mode: 'OPTIONAL',
            sms: {
              smsMessage: invalidMFAMessage,
            },
            totp: false,
          },
        }),
      {
        message:
          "Invalid MFA settings. Property 'smsMessage' must utilize the 'code' parameter at least once as a placeholder for the verification code.",
      }
    );
  });

  void it('requires email attribute if email is enabled', () => {
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

  void it('sets account recovery settings ', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: { phone: true, email: true },
      accountRecovery: 'EMAIL_AND_PHONE_WITHOUT_MFA',
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      AccountRecoverySetting: {
        RecoveryMechanisms: [
          {
            Name: 'verified_email',
            Priority: 1,
          },
          {
            Name: 'verified_phone_number',
            Priority: 2,
          },
        ],
      },
    });
  });

  void it('creates user attributes', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: { email: true },
      userAttributes: {
        address: {
          mutable: false,
        },
        familyName: {
          required: true,
        },
      },
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
          Mutable: false,
          Name: 'address',
          Required: false,
        },
        {
          Mutable: true,
          Name: 'family_name',
          Required: true,
        },
      ],
    });
  });

  void describe('storeOutput', () => {
    void it('stores outputs in platform', () => {
      const app = new App();
      const stack = new Stack(app);

      const storeOutputMock = mock.fn();
      const stubBackendOutputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry> =
        {
          addBackendOutputEntry: storeOutputMock,
        };
      const authConstruct = new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
        },
        outputStorageStrategy: stubBackendOutputStorageStrategy,
      });

      const expectedUserPoolId = (
        authConstruct.node.findChild('UserPool') as UserPool
      ).userPoolId;
      const expectedIdentityPoolId = (
        authConstruct.node.findChild('IdentityPool') as CfnIdentityPool
      ).ref;
      const expectedWebClientId = (
        authConstruct.node.findChild('UserPoolAppClient') as UserPoolClient
      ).userPoolClientId;
      const expectedRegion = Stack.of(authConstruct).region;

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

    void it('stores output when no storage strategy is injected', () => {
      const app = new App();
      const stack = new Stack(app);

      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
        },
      });

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
            ],
          },
        },
      });
    });
  });

  void describe('defaults', () => {
    void it('creates email login by default', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
    });

    void it('creates the correct number of default resources', () => {
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

    void it('sets the case sensitivity to false', () => {
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

    void it('enables self signup', () => {
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

    void it('allows unauthenticated identities to the identity pool', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        AllowUnauthenticatedIdentities: true,
      });
    });

    void it('prevents user existence errors', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
      });
    });

    void it('sets the default password policy', () => {
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

    void it('sets default account recovery settings', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });

    void it('sets account recovery settings to phone if phone is the only login type', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', { loginWith: { phone: true } });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_phone_number',
              Priority: 1,
            },
          ],
        },
      });
    });

    void it('sets account recovery settings to email if both phone and email enabled', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: { phone: true, email: true },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        AccountRecoverySetting: {
          RecoveryMechanisms: [
            {
              Name: 'verified_email',
              Priority: 1,
            },
          ],
        },
      });
    });

    void it('require verification of email before updating email', () => {
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

    void it('sets deletion policy to destroy on user pool', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);

      template.hasResource('AWS::Cognito::UserPool', {
        DeletionPolicy: 'Delete',
        UpdateReplacePolicy: 'Delete',
      });
    });

    void it('enables SRP and Custom auth flows', () => {
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

    void it('creates a default client with cognito provider', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test');
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        SupportedIdentityProviders: ['COGNITO'],
      });
    });
  });

  void describe('Auth overrides', () => {
    void it('can override case sensitivity', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
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
    void it('can override setting to keep original attributes until verified', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test', {
        loginWith: { email: true },
      });
      auth.resources.cfnResources.cfnUserPool.addPropertyOverride(
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
    void it('can override settings for device configuration', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test', {
        loginWith: { email: true },
      });
      const userPoolResource = auth.resources.cfnResources.cfnUserPool;
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
    void it('can override password policy', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      const userPoolResource = auth.resources.cfnResources.cfnUserPool;
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
    void it('can override user existence errors', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      auth.resources.cfnResources.cfnUserPoolClient.addPropertyOverride(
        'PreventUserExistenceErrors',
        'LEGACY'
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'LEGACY',
      });
    });
    void it('can override guest access setting', () => {
      const app = new App();
      const stack = new Stack(app);
      const auth = new AmplifyAuth(stack, 'test');
      auth.resources.cfnResources.cfnIdentityPool.addPropertyOverride(
        'AllowUnauthenticatedIdentities',
        false
      );
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        AllowUnauthenticatedIdentities: false,
      });
    });
    void it('can override token validity period', () => {
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

  void describe('Auth external login', () => {
    void it('supports google idp and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedGoogleIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'accounts.google.com': googleClientId,
        },
      });
    });
    void it('supports google idp and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedGoogleIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'accounts.google.com': googleClientId,
        },
      });
    });
    void it('supports facebook idp and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedFacebookIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'graph.facebook.com': facebookClientId,
        },
      });
    });
    void it('supports facebook idp and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedFacebookIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'graph.facebook.com': facebookClientId,
        },
      });
    });
    void it('supports apple idp and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            signInWithApple: {
              clientId: appleClientId,
              keyId: appleKeyId,
              privateKey: applePrivateKey,
              teamId: appleTeamId,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAppleIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'appleid.apple.com': appleClientId,
        },
      });
    });
    void it('supports apple idp and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            signInWithApple: {
              clientId: appleClientId,
              keyId: appleKeyId,
              privateKey: applePrivateKey,
              teamId: appleTeamId,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAppleIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'appleid.apple.com': appleClientId,
        },
      });
    });
    void it('supports amazon idp and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            loginWithAmazon: {
              clientId: amazonClientId,
              clientSecret: amazonClientSecret,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAmazonIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'www.amazon.com': amazonClientId,
        },
      });
    });
    void it('supports amazon idp and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            loginWithAmazon: {
              clientId: amazonClientId,
              clientSecret: amazonClientSecret,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAmazonIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'www.amazon.com': amazonClientId,
        },
      });
    });
    void it('supports oidc and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            oidc: {
              clientId: oidcClientId,
              clientSecret: oidcClientSecret,
              issuerUrl: oidcIssuerUrl,
              name: oidcProviderName,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedOidcIDPProperties
      );
    });
    void it('supports oidc and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            oidc: {
              clientId: oidcClientId,
              clientSecret: oidcClientSecret,
              issuerUrl: oidcIssuerUrl,
              name: oidcProviderName,
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedOidcIDPProperties
      );
    });
    void it('supports saml and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            saml: {
              name: samlProviderName,
              metadata: {
                metadataContent: samlMetadataContent,
                metadataType: UserPoolIdentityProviderSamlMetadataType.FILE,
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedSAMLIDPProperties
      );
    });
    void it('supports saml and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            saml: {
              name: samlProviderName,
              metadata: {
                metadataContent: samlMetadataContent,
                metadataType: UserPoolIdentityProviderSamlMetadataType.FILE,
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['phone_number'],
        AutoVerifiedAttributes: ['phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedSAMLIDPProperties
      );
    });

    void it('supports additional oauth settings', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
            },
            scopes: ['EMAIL', 'PROFILE'],
            callbackUrls: ['http://localhost'],
            logoutUrls: ['http://localhost'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedGoogleIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'accounts.google.com': googleClientId,
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
        PreventUserExistenceErrors: 'ENABLED',
        CallbackURLs: ['http://localhost'],
        LogoutURLs: ['http://localhost'],
        AllowedOAuthScopes: ['email', 'profile', 'openid'],
      });
    });

    void it('supports all idps and login methods', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          phone: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
            },
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
            },
            signInWithApple: {
              clientId: appleClientId,
              keyId: appleKeyId,
              privateKey: applePrivateKey,
              teamId: appleTeamId,
            },
            loginWithAmazon: {
              clientId: amazonClientId,
              clientSecret: amazonClientSecret,
            },
            oidc: {
              clientId: oidcClientId,
              clientSecret: oidcClientSecret,
              issuerUrl: oidcIssuerUrl,
              name: oidcProviderName,
            },
            saml: {
              name: samlProviderName,
              metadata: {
                metadataContent: samlMetadataContent,
                metadataType: UserPoolIdentityProviderSamlMetadataType.FILE,
              },
            },
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email', 'phone_number'],
        AutoVerifiedAttributes: ['email', 'phone_number'],
      });
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAmazonIDPProperties
      );
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedAppleIDPProperties
      );
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedFacebookIDPProperties
      );
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedGoogleIDPProperties
      );
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedOidcIDPProperties
      );
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedSAMLIDPProperties
      );
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'www.amazon.com': amazonClientId,
          'accounts.google.com': googleClientId,
          'appleid.apple.com': appleClientId,
          'graph.facebook.com': facebookClientId,
        },
      });
    });
  });

  void describe('addTrigger', () => {
    void it('attaches lambda function to UserPool Lambda config', () => {
      const app = new App();
      const stack = new Stack(app);
      const testFunc = new Function(stack, 'testFunc', {
        code: Code.fromInline('test code'),
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
      });
      const authConstruct = new AmplifyAuth(stack, 'testAuth', {
        loginWith: { email: true },
      });
      authConstruct.addTrigger('createAuthChallenge', testFunc);
      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      if (Object.keys(lambdas).length !== 1) {
        assert.fail(
          'Expected one and only one lambda function in the template'
        );
      }
      const handlerLogicalId = Object.keys(lambdas)[0];
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        LambdaConfig: {
          CreateAuthChallenge: {
            ['Fn::GetAtt']: [handlerLogicalId, 'Arn'],
          },
        },
      });
    });

    void it('attaches AmplifyFunction to UserPool Lambda config', () => {
      const app = new App();
      const stack = new Stack(app);
      const testFunc = new Function(stack, 'testFunc', {
        code: Code.fromInline('test code'),
        handler: 'index.handler',
        runtime: Runtime.NODEJS_18_X,
      });
      const amplifyFuncStub: AmplifyFunction = {
        resources: {
          lambda: testFunc,
        },
      };
      const authConstruct = new AmplifyAuth(stack, 'testAuth', {
        loginWith: { email: true },
      });
      authConstruct.addTrigger('createAuthChallenge', amplifyFuncStub);
      const template = Template.fromStack(stack);
      const lambdas = template.findResources('AWS::Lambda::Function');
      if (Object.keys(lambdas).length !== 1) {
        assert.fail(
          'Expected one and only one lambda function in the template'
        );
      }
      const handlerLogicalId = Object.keys(lambdas)[0];
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        LambdaConfig: {
          CreateAuthChallenge: {
            ['Fn::GetAtt']: [handlerLogicalId, 'Arn'],
          },
        },
      });
    });

    void it('stores attribution data in stack', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'testAuth', {
        loginWith: { email: true },
      });

      const template = Template.fromStack(stack);
      assert.equal(
        JSON.parse(template.toJSON().Description).stackType,
        'auth-Cognito'
      );
    });
  });
});
