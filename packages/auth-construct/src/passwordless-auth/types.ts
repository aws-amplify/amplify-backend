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

export type DefineAuthChallengeTriggerHandler =
  Handler<DefineAuthChallengeTriggerEvent>;

export type CreateAuthChallengeTriggerEvent = {
  request: {
    userAttributes: StringMap;
    challengeName: string;
    session: Array<ChallengeResult | CustomChallengeResult>;
    clientMetadata?: StringMap | undefined;
    userNotFound?: boolean | undefined;
  };
  response: {
    publicChallengeParameters: StringMap;
    privateChallengeParameters: StringMap;
    challengeMetadata?: string;
  };
} & BaseTriggerEvent<'CreateAuthChallenge_Authentication'>;

export type CreateAuthChallengeTriggerHandler =
  Handler<CreateAuthChallengeTriggerEvent>;

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

export type VerifyAuthChallengeResponseTriggerHandler =
  Handler<VerifyAuthChallengeResponseTriggerEvent>;

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

export type Handler<TEvent = any, TResult = any> = (
  event: TEvent,
  context: Context,
  callback: Callback<TResult>
) => void | Promise<TResult>;

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

  getRemainingTimeInMillis: () => number;

  // Functions for compatibility with earlier Node.js Runtime v0.10.42
  // No longer documented, so they are deprecated, but they still work
  // as of the 12.x runtime, so they are not removed from the types.

  /** @deprecated Use handler callback or promise result */
  done: (error?: Error, result?: any) => void;
  /** @deprecated Use handler callback with first argument or reject a promise result */
  fail: (error: Error | string) => void;
  /** @deprecated Use handler callback with second argument or resolve a promise result */
  succeed: ((messageOrObject: any) => void) &
    ((message: string, object: any) => void);
};

export type Callback<TResult = any> = (
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
  Custom?: any;
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
   * A redirect URL, with a placeholder for the code.
   * For example: "https://example.com/sign-in?code=##code##"
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
