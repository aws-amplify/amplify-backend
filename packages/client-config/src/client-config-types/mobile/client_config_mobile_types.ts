export type ClientConfigMobile = {
  UserAgent: 'aws-amplify-cli/2.0';
  Version: '1.0';
  api?: ClientConfigMobileApi;
  auth?: ClientConfigMobileAuth;
};

export type ClientConfigMobileApi = {
  plugins: {
    awsAPIPlugin: Record<
      string,
      {
        endpointType: 'GraphQL';
        endpoint: string;
        region: string;
        authorizationType: string;
        apiKey?: string;
      }
    >;
  };
};

export type ClientConfigMobileAuth = {
  plugins: {
    awsCognitoAuthPlugin: {
      UserAgent: 'aws-amplify-cli/2.0';
      Version: '1.0';
      CredentialsProvider: {
        CognitoIdentity: {
          Default: {
            PoolId: string;
            Region: string;
          };
        };
      };
      CognitoUserPool: {
        Default: {
          PoolId: string;
          AppClientId: string;
          Region: string;
        };
      };
      Auth: {
        Default: {
          OAuth: {
            WebDomain: string;
            AppClientId: string;
            SignInRedirectURI: string;
            SignOutRedirectURI: string;
            Scopes: Array<string>;
          };
          authenticationFlowType: string;
          socialProviders: Array<string>;
          usernameAttributes: Array<string>;
          signupAttributes: Array<string>;
          passwordProtectionSettings: {
            passwordPolicyMinLength: number;
            passwordPolicyCharacters: Array<string>;
          };
          mfaConfiguration: string;
          mfaTypes: Array<string>;
          verificationMechanisms: Array<string>;
        };
      };
      AppSync?: {
        Default: {
          ApiUrl: string;
          Region: string;
          AuthMode: string;
          ApiKey?: string;
          ClientDatabasePrefix: string;
        };
      };
    };
  };
};
