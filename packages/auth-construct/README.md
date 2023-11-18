# AmplifyAuth Construct

This package vends an L3 CDK Construct wrapping the behavior of Amplify Auth. This enables quick development and interation with AWS Cognito.

The primary way to use this construct is to invoke it with a configuration object. You can declare the individual settings for your authentication by passing them as properties to the AmplifyAuth construct.

Note: only a single instance of the `AmplifyAuth` construct can be invoked within a CDK synthesis at this point in time.

## Examples

### Simple email login with default settings

In this example, you create a simple stack with email login enabled (by default). Deploying this will create a UserPool, UserPoolClient, IdentityPool, and Authenticated/Unauthenticated Roles.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'Auth');

new AmplifyAuth(stack, 'Auth');
```

### Email login with customized multifactor settings

In this example, we create a simple stack with email login enabled and with customized multifactor authentication settings.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'Auth');

new AmplifyAuth(stack, 'Auth', {
  loginWith: {
    email: true,
  },
  multifactor: {
    mode: 'OPTIONAL',
    sms: {
      smsMessage: (code: string) => `valid MFA message with ${code}`,
    },
    totp: false,
  },
});
```

### Customized email and phone login with external login providers

In this example, we create a stack with email, phone, and external login providers. Additionally, we have customized email and phone verification messages.

```ts
import { App, Stack, SecretValue } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';
import { UserPoolIdentityProviderSamlMetadataType } from 'aws-cdk-lib/aws-cognito';

const app = new App();
const stack = new Stack(app, 'Auth');

new AmplifyAuth(stack, 'Auth', {
  loginWith: {
    email: {
      verificationEmailStyle: 'CODE',
      verificationEmailBody: (code: string) =>
        `Your verification code is ${code}.`,
      verificationEmailSubject: 'My custom email subject',
    },
    phone: {
      verificationMessage: (code: string) =>
        `Your verification code is ${code}.`,
    },
    externalProviders: {
      google: {
        clientId: 'googleClientId',
        clientSecret: SecretValue.unsafePlainText(googleClientSecret),
      },
      facebook: {
        clientId: 'facebookClientId',
        clientSecret: 'facebookClientSecret',
      },
      signInWithApple: {
        clientId: 'appleClientId',
        keyId: 'appleKeyId',
        privateKey: 'applePrivateKey',
        teamId: 'appleTeamId',
      },
      loginWithAmazon: {
        clientId: 'amazonClientId',
        clientSecret: 'amazonClientSecret',
      },
      oidc: {
        clientId: 'oidcClientId',
        clientSecret: 'oidcClientSecret',
        issuerUrl: 'oidcIssuerUrl',
        name: 'oidcProviderName',
      },
      saml: {
        name: 'samlProviderName',
        metadata: {
          metadataContent: 'samlMetadataContent',
          metadataType: UserPoolIdentityProviderSamlMetadataType.FILE,
        },
      },
    },
  },
});
```

### Custom user attributes

In this example, you are customizing the set of attributes that are required for every user in the UserPool.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'Auth', {
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

new AmplifyAuth(stack, 'Auth');
```
