export type DefineAuthChallengeTriggerEvent = {
  request: {
    userAttributes: StringMap;
    session: Array<ChallengeResult | CustomChallengeResult>;
    clientMetadata?: StringMap | undefined;
    userNotFound?: boolean | undefined;
  };
  response: {
    challengeName?: string;
    failAuthentication?: boolean;
    issueTokens?: boolean;
  };
} & BaseTriggerEvent<'DefineAuthChallenge_Authentication'>;

export type CreateAuthChallengeTriggerEvent = {
  request: {
    userAttributes: StringMap;
    challengeName: string;
    session: Array<ChallengeResult | CustomChallengeResult>;
    clientMetadata?: StringMap | undefined;
    userNotFound?: boolean | undefined;
  };
  response: {
    publicChallengeParameters: PasswordlessAuthChallengeParams;
    privateChallengeParameters: StringMap;
    challengeMetadata?: string;
  };
} & BaseTriggerEvent<'CreateAuthChallenge_Authentication'>;

export type VerifyAuthChallengeResponseTriggerEvent = {
  request: {
    userAttributes: StringMap;
    privateChallengeParameters: StringMap;
    challengeAnswer: string;
    clientMetadata?: StringMap | undefined;
    userNotFound?: boolean | undefined;
  };
  response: {
    answerCorrect?: boolean;
  };
} & BaseTriggerEvent<'VerifyAuthChallengeResponse_Authentication'>;

export type StringMap = {
  [name: string]: string;
};

export type ChallengeResult = {
  challengeName: ChallengeName;
  challengeResult: boolean;
  challengeMetadata?: undefined;
};

export type CustomChallengeResult = {
  challengeName: 'CUSTOM_CHALLENGE';
  challengeResult: boolean;
  challengeMetadata?: string | undefined;
};

export type ChallengeName =
  | 'PASSWORD_VERIFIER'
  | 'SMS_MFA'
  | 'DEVICE_SRP_AUTH'
  | 'DEVICE_PASSWORD_VERIFIER'
  | 'ADMIN_NO_SRP_AUTH'
  | 'SRP_A';

export type Context = {
  callbackWaitsForEmptyEventLoop: boolean;
  functionName: string;
  functionVersion: string;
  invokedFunctionArn: string;
  memoryLimitInMB: string;
  awsRequestId: string;
  logGroupName: string;
  logStreamName: string;
  identity?: CognitoIdentity | undefined;
  clientContext?: ClientContext | undefined;
  // eslint-disable-next-line spellcheck/spell-checker
  getRemainingTimeInMillis: () => number;
};

export type Callback<TResult = object> = (
  error?: Error | string | null,
  result?: TResult
) => void;

export type CognitoIdentity = {
  cognitoIdentityId: string;
  cognitoIdentityPoolId: string;
};

export type ClientContext = {
  client: ClientContextClient;
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Custom?: object;
  env: ClientContextEnv;
};

export type ClientContextClient = {
  installationId: string;
  appTitle: string;
  appVersionName: string;
  appVersionCode: string;
  appPackageName: string;
};

export type ClientContextEnv = {
  platformVersion: string;
  platform: string;
  make: string;
  model: string;
  locale: string;
};

export type BaseTriggerEvent<T extends string> = {
  version: string;
  region: string;
  userPoolId: string;
  triggerSource: T;
  userName: string;
  callerContext: {
    awsSdkVersion: string;
    clientId: string;
  };
  request: object;
  response: object;
};

/**
 * The client meta data object provided during passwordless auth.
 */
export type PasswordlessClientMetaData =
  | RequestMagicLinkClientMetaData
  | ConfirmMagicLinkClientMetaData
  | RequestOTPClientMetaData
  | ConfirmOTPClientMetaData;

export type RequestMagicLinkClientMetaData = {
  signInMethod: 'MAGIC_LINK';
  action: 'REQUEST';
  deliveryMedium: 'EMAIL';

  /**
   * A redirect URL with a code placeholder. For example: 'https://example.com/signin?code=##code##'
   */
  redirectUri: string;
};

export type ConfirmMagicLinkClientMetaData = {
  signInMethod: 'MAGIC_LINK';
  action: 'CONFIRM';
};

export type RequestOTPClientMetaData = {
  signInMethod: 'OTP';
  action: 'REQUEST';
  deliveryMedium: 'SMS' | 'EMAIL';
};

export type ConfirmOTPClientMetaData = {
  signInMethod: 'OTP';
  action: 'CONFIRM';
};

export type PasswordlessAuthChallengeParams =
  | InitiateAuthChallengeParams
  | RespondToAutChallengeParams
  | EmptyAuthChallengeParams;

type EmptyAuthChallengeParams = { [index: string]: never };

type InitiateAuthChallengeParams = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  NextStep: 'PROVIDE_AUTH_PARAMETERS'; //
};

type RespondToAutChallengeParams = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  NextStep: 'PROVIDE_CHALLENGE_RESPONSE';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  CodeDeliveryDetails: CodeDeliveryDetails;
};

type CodeDeliveryDetails = {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  AttributeName: 'email' | 'phone_number';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  DeliveryMedium: 'EMAIL' | 'SMS';
  // eslint-disable-next-line @typescript-eslint/naming-convention
  Destination: string;
};

/**
 * Options for passwordless auth.
 */
export type PasswordlessAuthProps = {
  magicLink?: MagicLinkAuthOptions;
};

/**
 * Options for Magic Link Passwordless Auth.
 */
export type MagicLinkAuthOptions = {
  enabled: boolean;
  fromAddress: string;
};
