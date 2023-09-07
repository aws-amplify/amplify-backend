import { describe, it } from 'node:test';
import { AmplifyAuth } from './construct.js';
import { App, SecretValue, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { UserPoolIdentityProviderSamlMetadataType } from 'aws-cdk-lib/aws-cognito';
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
const oidcProviderName = 'myoidcprovider';
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
describe('Auth external login', () => {
  it('supports google idp and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
          google: {
            clientId: googleClientId,
            clientSecretValue: SecretValue.unsafePlainText(googleClientSecret),
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
  it('supports google idp and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
          google: {
            clientId: googleClientId,
            clientSecretValue: SecretValue.unsafePlainText(googleClientSecret),
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
  it('supports facebook idp and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
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
  it('supports facebook idp and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
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
  it('supports apple idp and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
          apple: {
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
  it('supports apple idp and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
          apple: {
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
  it('supports amazon idp and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
          amazon: {
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
  it('supports amazon idp and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
          amazon: {
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
  it('supports oidc and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
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
  it('supports oidc and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
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
  it('supports saml and email', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        externalAuthProviders: {
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
  it('supports saml and phone', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        phoneNumber: true,
        externalAuthProviders: {
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

  it('supports all idps and login methods', () => {
    const app = new App();
    const stack = new Stack(app);
    new AmplifyAuth(stack, 'test', {
      loginWith: {
        email: true,
        phoneNumber: true,
        externalAuthProviders: {
          google: {
            clientId: googleClientId,
            clientSecretValue: SecretValue.unsafePlainText(googleClientSecret),
          },
          facebook: {
            clientId: facebookClientId,
            clientSecret: facebookClientSecret,
          },
          apple: {
            clientId: appleClientId,
            keyId: appleKeyId,
            privateKey: applePrivateKey,
            teamId: appleTeamId,
          },
          amazon: {
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
