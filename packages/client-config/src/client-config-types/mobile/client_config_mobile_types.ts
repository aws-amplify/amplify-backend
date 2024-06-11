export type ClientConfigMobile = {
  UserAgent: string;
  Version: '1.0';
  analytics?: ClientConfigMobileAnalytics;
  api?: ClientConfigMobileApi;
  auth?: ClientConfigMobileAuth;
  geo?: ClientConfigMobileGeo;
  notifications?: ClientConfigMobileNotifications;
  storage?: ClientConfigMobileStorage;
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

export type ClientConfigMobileAppsyncAuth = {
  ApiUrl: string;
  Region: string | undefined;
  AuthMode: string | undefined;
  ApiKey: string | undefined;
  ClientDatabasePrefix: string | undefined;
};

// Reference: https://github.com/aws-amplify/amplify-cli/blob/80a596498584d3f9bfeb0ffbde4a0d4256f971eb/packages/amplify-frontend-ios/lib/frontend-config-creator.js#L243-L255
// Note that AppClientSecret is not here since we don't collect it in Gen2
export type ClientConfigMobileAuthOAuthConfig = {
  WebDomain: string | undefined;
  Scopes: Array<string> | undefined;
  SignInRedirectURI: string | undefined;
  SignOutRedirectURI: string | undefined;
  AppClientId: string | undefined;
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
          OAuth?: ClientConfigMobileAuthOAuthConfig;
        };
      };
      AppSync?: {
        Default: ClientConfigMobileAppsyncAuth;
      } & Record<string, ClientConfigMobileAppsyncAuth>;
    };
  };
};

export type ClientConfigMobileGeo = {
  plugins: {
    awsLocationGeoPlugin: {
      region: string;
      maps?: {
        items: Record<
          string,
          {
            style: string;
          }
        >;

        default: string;
      };
      searchIndices?: {
        items: Array<string>;
        default: string;
      };
    };
  };
};

export type ClientConfigMobileAnalytics = {
  plugins: {
    awsPinpointAnalyticsPlugin: {
      pinpointAnalytics: {
        appId: string;
        region: string;
      };
      pinpointTargeting: {
        region: string;
      };
    };
  };
};

export type ClientConfigMobileStorage = {
  plugins: {
    awsS3StoragePlugin: {
      bucket: string;
      region?: string;
    };
  };
};

export type ClientConfigMobileNotifications = {
  plugins: {
    awsPinpointSmsNotificationsPlugin?: {
      appId: string;
      region: string;
    };
    awsPinpointEmailNotificationsPlugin?: {
      appId: string;
      region: string;
    };
    awsPinpointPushNotificationsPlugin?: {
      appId: string;
      region: string;
    };
    awsPinpointInAppMessagingNotificationsPlugin?: {
      appId: string;
      region: string;
    };
  };
};
