# AmplifyAuth Construct

This package vends an L3 CDK Construct that enables faster, easier and secure app authentication and authorization powered by Amazon Cognito. Amplify Auth lets you quickly set up secure authentication flows with a fully-managed user directory. Control what users have access to in your mobile and web apps with Amplify Auth's built-in authorization capabilities.

The primary way to use this construct is to invoke it with a configuration object. You can declare the individual settings for your authentication by passing them as properties to the AmplifyAuth construct.

Note: only a single instance of the `AmplifyAuth` construct can be invoked within a CDK synthesis at this point in time.

## Examples

### Simple email login with default settings

In this example, you will create a simple stack with email login enabled (by default). Deploying this will create a UserPool, UserPoolClient, IdentityPool, and Authenticated/Unauthenticated IAM Roles.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'AuthStack');

new AmplifyAuth(stack, 'Auth');
```

### Email login with customized multifactor settings

In this example, you will create a simple stack with email login enabled and with customized multi factor authentication (MFA) settings.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'AuthStack');

new AmplifyAuth(stack, 'Auth', {
  loginWith: {
    email: true,
  },
  multifactor: {
    mode: 'OPTIONAL',
    sms: {
      smsMessage: (code: string) => `Your verification code is ${code}`,
    },
    totp: false,
  },
});
```

### Customized email and phone login with external login providers

In this example, you will create a stack with email, phone, and external login providers. Additionally, you can customize the email and phone verification messages.

```ts
import { App, Stack, SecretValue } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'AuthStack');

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
        // see https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.SecretValue.html
        clientSecret: SecretValue.unsafePlainText('googleClientSecret'),
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
          metadataType: 'FILE',
        },
      },
    },
  },
});
```

### Custom user attributes

In this example, you will customize the set of attributes that are required for every user in the UserPool.

```ts
import { App, Stack } from 'aws-cdk-lib';
import { AmplifyAuth } from '@aws-amplify/auth-construct';

const app = new App();
const stack = new Stack(app, 'AuthStack');

new AmplifyAuth(stack, 'Auth', {
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
```
