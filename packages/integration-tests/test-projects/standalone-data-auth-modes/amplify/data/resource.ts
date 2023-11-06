import { Func, defineData } from '@aws-amplify/backend';

export const data = defineData({
  schema: /* GraphQL */ `
    type Todo
      @model
      @auth(
        rules: [
          { allow: custom }
          { allow: owner, provider: oidc }
          { allow: public }
        ]
      ) {
      title: String!
    }
  `,
  authorizationModes: {
    defaultAuthorizationMode: 'AWS_LAMBDA',
    lambdaAuthorizationMode: {
      function: Func.fromDir({
        name: 'ApiAuth',
        codePath: 'api-auth',
      }),
      timeToLiveInSeconds: 0,
    },
    oidcAuthorizationMode: {
      oidcProviderName: 'fake-provider',
      oidcIssuerUrl: 'https://fake-provider.fake/',
      tokenExpiryFromAuthInSeconds: 50,
      tokenExpireFromIssueInSeconds: 60,
    },
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
