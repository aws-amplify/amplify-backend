import { beforeEach, describe, it, mock } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import assert from 'node:assert';
import {
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import {
  CfnIdentityPool,
  CfnUserPoolClient,
  ProviderAttribute,
  UserPool,
  UserPoolClient,
} from 'aws-cdk-lib/aws-cognito';
import { authOutputKey } from '@aws-amplify/backend-output-schemas';
import { DEFAULTS } from './defaults.js';

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
const oidcProviderName = 'MyOidcProvider';
const oidcClientId2 = 'oidcClientId2';
const oidcClientSecret2 = 'oidcClientSecret2';
const oidcIssuerUrl2 = 'https://mysampleoidcissuer2.com';
const oidcProviderName2 = 'MyOidcProvider2';
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
const ExpectedOidcIDPProperties2 = {
  ProviderDetails: {
    attributes_request_method: 'GET',
    authorize_scopes: 'openid',
    client_id: oidcClientId2,
    client_secret: oidcClientSecret2,
    oidc_issuer: oidcIssuerUrl2,
  },
  ProviderName: oidcProviderName2,
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
const samlMetadataUrl = 'https://localhost:3000';
const ExpectedSAMLIDPViaURLProperties = {
  ProviderDetails: {
    IDPSignout: false,
    MetadataURL: samlMetadataUrl,
  },
  ProviderName: samlProviderName,
  ProviderType: 'SAML',
};
const defaultPasswordPolicyCharacterRequirements =
  '["REQUIRES_NUMBERS","REQUIRES_LOWERCASE","REQUIRES_UPPERCASE","REQUIRES_SYMBOLS"]';

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

  void it('creates user groups and group roles', () => {
    const app = new App();
    const stack = new Stack(app);
    const auth = new AmplifyAuth(stack, 'test', {
      loginWith: { email: true },
      groups: ['admins', 'managers'],
    });
    // validate the generated resources
    assert.equal(Object.keys(auth.resources.groups).length, 2);
    assert.equal(
      auth.resources.groups['admins'].cfnUserGroup.groupName,
      'admins'
    );
    assert.equal(
      auth.resources.groups['managers'].cfnUserGroup.groupName,
      'managers'
    );
    // validate generated template
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UsernameAttributes: ['email'],
      AutoVerifiedAttributes: ['email'],
    });
    template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
      GroupName: 'admins',
      Precedence: 0,
    });
    template.hasResourceProperties('AWS::Cognito::UserPoolGroup', {
      GroupName: 'managers',
      Precedence: 1,
    });
    // validate the generated policies
    const idpRef = template['template']['Outputs']['identityPoolId']['Value'];
    // There should be 3 matching roles, one for the auth role,
    // and one for each of the 'admins' and 'managers' roles
    const matchingRoleCount = 3;
    template.resourcePropertiesCountIs(
      'AWS::IAM::Role',
      {
        AssumeRolePolicyDocument: {
          Version: '2012-10-17',
          Statement: [
            {
              Action: 'sts:AssumeRoleWithWebIdentity',
              Effect: 'Allow',
              Principal: {
                Federated: 'cognito-identity.amazonaws.com',
              },
              Condition: {
                'ForAnyValue:StringLike': {
                  'cognito-identity.amazonaws.com:amr': 'authenticated',
                },
                StringEquals: {
                  'cognito-identity.amazonaws.com:aud': idpRef,
                },
              },
            },
          ],
        },
      },
      matchingRoleCount
    );
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
    const emailBodyFunction = (code: () => string) =>
      `custom email body ${code()}`;
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
    const emailBodyFunction = (code: () => string) =>
      `custom email body ${code()}`;
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
    const emailBodyFunction = (link: (text?: string) => string) =>
      `valid message ${link()} with link`;
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
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_LINK',
        EmailMessageByLink: 'valid message {##Verify Email##} with link',
      },
    });
  });

  void it('correctly formats email verification message for LINK with custom link text', () => {
    const app = new App();
    const stack = new Stack(app);
    const emailBodyFunction = (link: (text?: string) => string) =>
      `valid message ${link('my custom link')} with link`;
    const customEmailVerificationSubject = 'custom subject';
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: {
          verificationEmailBody: emailBodyFunction,
          verificationEmailStyle: 'LINK',
          verificationEmailSubject: customEmailVerificationSubject,
        },
      },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      VerificationMessageTemplate: {
        DefaultEmailOption: 'CONFIRM_WITH_LINK',
        EmailMessageByLink: 'valid message {##my custom link##} with link',
      },
    });
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

    void it('stores outputs in platform - minimum config', () => {
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
            passwordPolicyMinLength:
              DEFAULTS.PASSWORD_POLICY.minLength.toString(),
            passwordPolicyRequirements:
              defaultPasswordPolicyCharacterRequirements,
            signupAttributes: '["email"]',
            verificationMechanisms: '["email"]',
            usernameAttributes: '["email"]',
            allowUnauthenticatedIdentities: 'true',
          },
        },
      ]);
    });

    void it('stores outputs in platform - oauth config', () => {
      const authConstruct = new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
            },
            oidc: [
              {
                name: 'provider1',
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
              },
              {
                name: 'provider2',
                clientId: oidcClientId2,
                clientSecret: oidcClientSecret2,
                issuerUrl: oidcIssuerUrl2,
              },
              {
                clientId: 'clientId3',
                clientSecret: 'oidcClientSecret3',
                issuerUrl: 'oidcIssuerUrl3',
              },
            ],
            domainPrefix: 'test-prefix',
            scopes: ['EMAIL', 'PROFILE'],
            callbackUrls: ['http://callback.com'],
            logoutUrls: ['http://logout.com'],
          },
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
      const oidcProviders = authConstruct['providerSetupResult']['oidc'];
      if (oidcProviders) {
        const provider1 = oidcProviders[0].providerName;
        const provider2 = oidcProviders[1].providerName;
        const unnamedProvider = oidcProviders[2].providerName;
        assert.deepStrictEqual(storeOutputArgs, [
          authOutputKey,
          {
            version: '1',
            payload: {
              userPoolId: expectedUserPoolId,
              webClientId: expectedWebClientId,
              identityPoolId: expectedIdentityPoolId,
              authRegion: expectedRegion,
              passwordPolicyMinLength:
                DEFAULTS.PASSWORD_POLICY.minLength.toString(),
              passwordPolicyRequirements:
                defaultPasswordPolicyCharacterRequirements,
              signupAttributes: '["email"]',
              verificationMechanisms: '["email"]',
              usernameAttributes: '["email"]',
              googleClientId: 'googleClientId',
              oauthClientId: expectedWebClientId, // same thing
              oauthCognitoDomain: `test-prefix.auth.${expectedRegion}.amazoncognito.com`,
              oauthScope: '["email","profile"]',
              oauthRedirectSignIn: 'http://callback.com',
              oauthRedirectSignOut: 'http://logout.com',
              oauthResponseType: 'code',
              socialProviders: `["GOOGLE","${provider1}","${provider2}","${unnamedProvider}"]`,
              allowUnauthenticatedIdentities: 'true',
            },
          },
        ]);
      } else {
        assert.fail(
          'Providers were not properly initialized by the construct and could not be tested for output.'
        );
      }
    });

    void it('multifactor prop updates mfaConfiguration & mfaTypes', () => {
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
        },
        multifactor: { mode: 'OPTIONAL', sms: true, totp: true },
        outputStorageStrategy: stubBackendOutputStorageStrategy,
      });
      const { payload } = storeOutputMock.mock.calls[0].arguments[1];

      assert.equal(payload.mfaConfiguration, 'OPTIONAL');
      assert.equal(payload.mfaTypes, '["TOTP","SMS"]');
    });

    void it('userAttributes prop should update signupAttributes', () => {
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
        },
        userAttributes: {
          phoneNumber: { required: true, mutable: true },
          familyName: { required: false, mutable: true },
          address: { required: true, mutable: true },
        },
        outputStorageStrategy: stubBackendOutputStorageStrategy,
      });
      const { payload } = storeOutputMock.mock.calls[0].arguments[1];

      assert.equal(
        payload.signupAttributes,
        '["email","phone_number","address"]'
      );
    });

    void it('adding loginWith methods should update usernameAttributes & verificationMechanisms', () => {
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          phone: true,
        },
        outputStorageStrategy: stubBackendOutputStorageStrategy,
      });
      const { payload } = storeOutputMock.mock.calls[0].arguments[1];

      assert.equal(payload.usernameAttributes, '["email","phone_number"]');
      assert.equal(payload.verificationMechanisms, '["email","phone_number"]');
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
              'allowUnauthenticatedIdentities',
              'signupAttributes',
              'usernameAttributes',
              'verificationMechanisms',
              'passwordPolicyMinLength',
              'passwordPolicyRequirements',
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
      const authorizationURL = 'http://localhost:3000/authorization';
      const jwksURI = 'https://localhost:3000/jwksuri';
      const tokensURL = 'http://localhost:3000/token';
      const userInfoURL = 'http://localhost:3000/userinfo';
      const mockIdentifiers = ['one', 'two'];
      const mockScopes = ['scope1', 'scope2'];
      const attributeRequestMethod = 'POST';
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
                attributeMapping: {
                  email: 'email',
                },
                attributeRequestMethod: attributeRequestMethod,
                endpoints: {
                  authorization: authorizationURL,
                  jwksUri: jwksURI,
                  token: tokensURL,
                  userInfo: userInfoURL,
                },
                identifiers: mockIdentifiers,
                scopes: mockScopes,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        AttributeMapping: {
          email: 'email',
        },
        IdpIdentifiers: mockIdentifiers,
        ProviderDetails: {
          attributes_request_method: attributeRequestMethod,
          attributes_url: userInfoURL,
          authorize_scopes: mockScopes.join(' '),
          authorize_url: authorizationURL,
          client_id: oidcClientId,
          client_secret: oidcClientSecret,
          jwks_uri: jwksURI,
          oidc_issuer: oidcIssuerUrl,
          token_url: tokensURL,
        },
        ProviderName: oidcProviderName,
        ProviderType: 'OIDC',
      });
    });
    void it('oidc defaults to GET for oidc method', () => {
      const app = new App();
      const stack = new Stack(app);
      const authorizationURL = 'http://localhost:3000/authorization';
      const jwksURI = 'https://localhost:3000/jwksuri';
      const tokensURL = 'http://localhost:3000/token';
      const userInfoURL = 'http://localhost:3000/userinfo';
      const mockIdentifiers = ['one', 'two'];
      const mockScopes = ['scope1', 'scope2'];
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
                attributeMapping: {
                  email: 'email',
                },
                endpoints: {
                  authorization: authorizationURL,
                  jwksUri: jwksURI,
                  token: tokensURL,
                  userInfo: userInfoURL,
                },
                identifiers: mockIdentifiers,
                scopes: mockScopes,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        AttributeMapping: {
          email: 'email',
        },
        IdpIdentifiers: mockIdentifiers,
        ProviderDetails: {
          attributes_request_method: 'GET',
          attributes_url: userInfoURL,
          authorize_scopes: mockScopes.join(' '),
          authorize_url: authorizationURL,
          client_id: oidcClientId,
          client_secret: oidcClientSecret,
          jwks_uri: jwksURI,
          oidc_issuer: oidcIssuerUrl,
          token_url: tokensURL,
        },
        ProviderName: oidcProviderName,
        ProviderType: 'OIDC',
      });
    });
    void it('supports oidc and phone', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          phone: true,
          externalProviders: {
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
    void it('supports multiple oidc providers', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
              },
              {
                clientId: oidcClientId2,
                clientSecret: oidcClientSecret2,
                issuerUrl: oidcIssuerUrl2,
                name: oidcProviderName2,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
      template.hasResourceProperties(
        'AWS::Cognito::UserPoolIdentityProvider',
        ExpectedOidcIDPProperties2
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
                metadataType: 'FILE',
              },
            },
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
                metadataType: 'FILE',
              },
            },
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
    void it('supports saml via URL and email', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            saml: {
              name: samlProviderName,
              metadata: {
                metadataContent: samlMetadataUrl,
                metadataType: 'URL',
              },
            },
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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
        ExpectedSAMLIDPViaURLProperties
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
            domainPrefix: 'test-prefix',
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

    void it('throws an error if callbackUrls are not specified with external login providers', () => {
      const app = new App();
      const stack = new Stack(app);
      assert.throws(
        () =>
          new AmplifyAuth(stack, 'test', {
            loginWith: {
              email: true,
              externalProviders: {
                google: {
                  clientId: googleClientId,
                  clientSecret: SecretValue.unsafePlainText(googleClientSecret),
                },
                domainPrefix: 'test-prefix',
                scopes: ['EMAIL', 'PROFILE'],
                callbackUrls: [],
                logoutUrls: ['http://localhost'],
              },
            },
          }),
        {
          message:
            'You must define callbackUrls when configuring external login providers.',
        }
      );
    });

    void it('throws an error if domainPrefix is not specified with external login providers', () => {
      const app = new App();
      const stack = new Stack(app);
      assert.throws(
        () =>
          new AmplifyAuth(stack, 'test', {
            loginWith: {
              email: true,
              externalProviders: {
                google: {
                  clientId: googleClientId,
                  clientSecret: SecretValue.unsafePlainText(googleClientSecret),
                },
                scopes: ['EMAIL', 'PROFILE'],
                callbackUrls: ['http://redirect.com'],
                logoutUrls: ['http://localhost'],
              },
            },
          }),
        {
          message:
            'Cognito Domain Prefix is missing when external providers are configured.',
        }
      );
    });

    void it('throws an error if logoutUrls are not specified with external login providers', () => {
      const app = new App();
      const stack = new Stack(app);
      assert.throws(
        () =>
          new AmplifyAuth(stack, 'test', {
            loginWith: {
              email: true,
              externalProviders: {
                google: {
                  clientId: googleClientId,
                  clientSecret: SecretValue.unsafePlainText(googleClientSecret),
                },
                domainPrefix: 'test-prefix',
                scopes: ['EMAIL', 'PROFILE'],
                callbackUrls: ['http://redirect.com'],
                logoutUrls: [],
              },
            },
          }),
        {
          message:
            'You must define logoutUrls when configuring external login providers.',
        }
      );
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
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
              },
            ],
            saml: {
              name: samlProviderName,
              metadata: {
                metadataContent: samlMetadataContent,
                metadataType: 'FILE',
              },
            },
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
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

    void it('automatically maps email attributes for external providers excluding SAML', () => {
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
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      const expectedAutoMappedAttributes = {
        AttributeMapping: {
          // 'email' is a standardized claim for oauth and oidc IDPS
          // so we can map it to cognito's 'email' claim
          email: 'email',
        },
      };
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAmazonIDPProperties,
        ...expectedAutoMappedAttributes,
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAppleIDPProperties,
        ...expectedAutoMappedAttributes,
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedFacebookIDPProperties,
        ...expectedAutoMappedAttributes,
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedGoogleIDPProperties,
        ...expectedAutoMappedAttributes,
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedOidcIDPProperties,
        ...expectedAutoMappedAttributes,
      });
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'www.amazon.com': amazonClientId,
          'accounts.google.com': googleClientId,
          'appleid.apple.com': appleClientId,
          'graph.facebook.com': facebookClientId,
        },
      });
    });

    void it('does not automatically map email attributes if phone is also enabled', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          phone: true, // this makes phone_number a required attribute
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
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email', 'phone_number'],
        AutoVerifiedAttributes: ['email', 'phone_number'],
      });
      const mappingThatShouldNotExist = {
        AttributeMapping: {
          email: 'email',
        },
      };
      assert.throws(() => {
        template.hasResourceProperties(
          'AWS::Cognito::UserPoolIdentityProvider',
          {
            ...ExpectedAmazonIDPProperties,
            ...mappingThatShouldNotExist,
          }
        );
      });
      assert.throws(() => {
        template.hasResourceProperties(
          'AWS::Cognito::UserPoolIdentityProvider',
          {
            ...ExpectedAppleIDPProperties,
            ...mappingThatShouldNotExist,
          }
        );
      });
      assert.throws(() => {
        template.hasResourceProperties(
          'AWS::Cognito::UserPoolIdentityProvider',
          {
            ...ExpectedFacebookIDPProperties,
            ...mappingThatShouldNotExist,
          }
        );
      });
      assert.throws(() => {
        template.hasResourceProperties(
          'AWS::Cognito::UserPoolIdentityProvider',
          {
            ...ExpectedGoogleIDPProperties,
            ...mappingThatShouldNotExist,
          }
        );
      });
      assert.throws(() => {
        template.hasResourceProperties(
          'AWS::Cognito::UserPoolIdentityProvider',
          {
            ...ExpectedOidcIDPProperties,
            ...mappingThatShouldNotExist,
          }
        );
      });
    });

    void it('automatically maps email attributes for external providers and keeps existing configuration', () => {
      const app = new App();
      const stack = new Stack(app);
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
              attributeMapping: {
                fullname: ProviderAttribute.GOOGLE_NAME.attributeName,
              },
            },
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
              attributeMapping: {
                fullname: ProviderAttribute.FACEBOOK_NAME.attributeName,
              },
            },
            signInWithApple: {
              clientId: appleClientId,
              keyId: appleKeyId,
              privateKey: applePrivateKey,
              teamId: appleTeamId,
              attributeMapping: {
                fullname: ProviderAttribute.APPLE_NAME.attributeName,
              },
            },
            loginWithAmazon: {
              clientId: amazonClientId,
              clientSecret: amazonClientSecret,
              attributeMapping: {
                fullname: ProviderAttribute.AMAZON_NAME.attributeName,
              },
            },
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
                attributeMapping: {
                  fullname: 'name',
                },
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      const expectedAutoMappedAttributes = {
        AttributeMapping: {
          // 'email' is a standardized claim for oauth and oidc IDPS
          // so we can map it to cognito's 'email' claim
          email: 'email',
        },
      };
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAmazonIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.AMAZON_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAppleIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.APPLE_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedFacebookIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.FACEBOOK_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedGoogleIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.GOOGLE_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedOidcIDPProperties,
        AttributeMapping: {
          ...expectedAutoMappedAttributes.AttributeMapping,
          name: 'name',
        },
      });
      template.hasResourceProperties('AWS::Cognito::IdentityPool', {
        SupportedLoginProviders: {
          'www.amazon.com': amazonClientId,
          'accounts.google.com': googleClientId,
          'appleid.apple.com': appleClientId,
          'graph.facebook.com': facebookClientId,
        },
      });
    });

    void it('should not override email attribute mapping if customer providers their own mapping', () => {
      const app = new App();
      const stack = new Stack(app);
      const customEmailMapping = 'customMapping';
      new AmplifyAuth(stack, 'test', {
        loginWith: {
          email: true,
          externalProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: SecretValue.unsafePlainText(googleClientSecret),
              attributeMapping: {
                email: customEmailMapping,
                fullname: ProviderAttribute.GOOGLE_NAME.attributeName,
              },
            },
            facebook: {
              clientId: facebookClientId,
              clientSecret: facebookClientSecret,
              attributeMapping: {
                email: customEmailMapping,
                fullname: ProviderAttribute.FACEBOOK_NAME.attributeName,
              },
            },
            signInWithApple: {
              clientId: appleClientId,
              keyId: appleKeyId,
              privateKey: applePrivateKey,
              teamId: appleTeamId,
              attributeMapping: {
                email: customEmailMapping,
                fullname: ProviderAttribute.APPLE_NAME.attributeName,
              },
            },
            loginWithAmazon: {
              clientId: amazonClientId,
              clientSecret: amazonClientSecret,
              attributeMapping: {
                email: customEmailMapping,
                fullname: ProviderAttribute.AMAZON_NAME.attributeName,
              },
            },
            oidc: [
              {
                clientId: oidcClientId,
                clientSecret: oidcClientSecret,
                issuerUrl: oidcIssuerUrl,
                name: oidcProviderName,
                attributeMapping: {
                  email: customEmailMapping,
                  fullname: 'name',
                },
              },
            ],
            domainPrefix: 'test-prefix',
            callbackUrls: ['https://redirect.com'],
            logoutUrls: ['https://logout.com'],
          },
        },
      });
      const template = Template.fromStack(stack);
      template.hasResourceProperties('AWS::Cognito::UserPool', {
        UsernameAttributes: ['email'],
        AutoVerifiedAttributes: ['email'],
      });
      const expectedAutoMappedAttributes = {
        AttributeMapping: {
          email: customEmailMapping,
        },
      };
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAmazonIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.AMAZON_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedAppleIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.APPLE_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedFacebookIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.FACEBOOK_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedGoogleIDPProperties,
        ...{
          AttributeMapping: {
            ...expectedAutoMappedAttributes.AttributeMapping,
            name: ProviderAttribute.GOOGLE_NAME.attributeName,
          },
        },
      });
      template.hasResourceProperties('AWS::Cognito::UserPoolIdentityProvider', {
        ...ExpectedOidcIDPProperties,
        AttributeMapping: {
          ...expectedAutoMappedAttributes.AttributeMapping,
          name: 'name',
        },
      });
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

  void it('sets resource names based on id and name property', () => {
    const app = new App();
    const stack = new Stack(app);
    const stackId = 'test';
    const name = 'name';
    const expectedPrefix = stackId + name;
    new AmplifyAuth(stack, 'test', {
      name: name,
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
          oidc: [
            {
              clientId: oidcClientId,
              clientSecret: oidcClientSecret,
              issuerUrl: oidcIssuerUrl,
              name: oidcProviderName,
            },
          ],
          saml: {
            name: samlProviderName,
            metadata: {
              metadataContent: samlMetadataContent,
              metadataType: 'FILE',
            },
          },
          domainPrefix: 'test-prefix',
          callbackUrls: ['https://redirect.com'],
          logoutUrls: ['https://logout.com'],
        },
      },
    });
    const template = Template.fromStack(stack);
    const resourceNames = Object.keys(template['template']['Resources']);
    resourceNames.map((name) => {
      assert.equal(name.startsWith(expectedPrefix), true);
    });
  });
});
