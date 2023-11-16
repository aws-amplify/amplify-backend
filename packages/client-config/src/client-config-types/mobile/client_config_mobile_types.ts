export type ClientConfigMobile = {
  UserAgent: string;
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
        region: string | undefined;
        authorizationType: string | undefined;
        apiKey: string | undefined;
      }
    >;
  };
};

export type ClientConfigMobileAuth = {
  plugins: {
    awsCognitoAuthPlugin: {
      UserAgent: string;
      Version: '1.0';
      CredentialsProvider: {
        CognitoIdentity: {
          Default: {
            PoolId: string | undefined;
            Region: string | undefined;
          };
        };
      };
      CognitoUserPool: {
        Default: {
          PoolId: string | undefined;
          AppClientId: string | undefined;
          Region: string | undefined;
        };
      };
      Auth: {
        Default: {
          authenticationFlowType: 'USER_SRP_AUTH';
          mfaConfiguration: string | undefined;
          mfaTypes: Array<string> | undefined;
          passwordProtectionSettings: {
            passwordPolicyMinLength: number | undefined;
            passwordPolicyCharacters: Array<string>;
          };
          signupAttributes: Array<string>;
          usernameAttributes: Array<string>;
          verificationMechanisms: Array<string>;
        };
      };
      AppSync?: {
        Default: {
          ApiUrl: string;
          Region: string | undefined;
          AuthMode: string | undefined;
          ApiKey: string | undefined;
        };
      };
    };
  };
};
