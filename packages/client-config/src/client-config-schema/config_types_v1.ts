/**
 * outputs generated by AWS Amplify (Gen 2) backends
 */
export type ConfigTypesV1 = {
  /**
   * Version of this schema
   */
  _version: '1';
  /**
   * Outputs generated from defineAuth
   */
  auth?: Auth;
  /**
   * Outputs generated from defineAuth
   */
  custom?: { [key: string]: any };
  /**
   * Outputs generated from defineData
   */
  data?: Data;
  /**
   * Outputs generated from defineStorage
   */
  storage?: Storage;
};

/**
 * Outputs generated from defineAuth
 */
export type Auth = {
  aws_region?: AwsRegion;
  /**
   * Cognito Identity Pool ID
   */
  identity_pool_id?: string;
  mfa_configuration?: MfaConfiguration;
  mfa_methods?: MfaMethod[];
  oauth_domain?: string;
  oauth_redirect_sign_in?: string;
  oauth_redirect_sign_out?: string;
  oauth_response_type?: OauthResponseType;
  oauth_scope?: string[];
  password_policy_characters?: PasswordPolicyCharacter[];
  password_policy_min_length?: number;
  social_providers?: string[];
  /**
   * Cognito User Pool Client ID
   */
  user_pool_client_id?: string;
  /**
   * Cognito User Pool ID
   */
  user_pool_id?: string;
  user_sign_up_attributes?: string[];
  user_username_attributes?: UserUsernameAttribute[];
  user_verification_mechanisms?: UserVerificationMechanism[];
};

export enum AwsRegion {
  UsEast1 = 'us-east-1',
  UsEast2 = 'us-east-2',
  UsWest1 = 'us-west-1',
  UsWest2 = 'us-west-2',
}

export enum MfaConfiguration {
  None = 'NONE',
  Optional = 'OPTIONAL',
  Required = 'REQUIRED',
}

export enum MfaMethod {
  SMS = 'SMS',
  Totp = 'TOTP',
}

export enum OauthResponseType {
  Code = 'code',
  Token = 'token',
}

export enum PasswordPolicyCharacter {
  RequiresLowercase = 'REQUIRES_LOWERCASE',
  RequiresNumbers = 'REQUIRES_NUMBERS',
  RequiresSymbols = 'REQUIRES_SYMBOLS',
  RequiresUppercase = 'REQUIRES_UPPERCASE',
}

export enum UserUsernameAttribute {
  Email = 'email',
  Phone = 'phone',
  PreferredUsername = 'preferred_username',
  Username = 'username',
}

export enum UserVerificationMechanism {
  Email = 'email',
  Phone = 'phone',
}

/**
 * Outputs generated from defineData
 */
export type Data = {
  api_key?: string;
  authorization_types?: AuthorizationType[];
  aws_region?: AwsRegion;
  default_authorization_type?: string;
  /**
   * generated model introspection schema for use with generateClient
   */
  model_introspection?: { [key: string]: any };
  /**
   * AppSync endpoint URL
   */
  url?: string;
};

export enum AuthorizationType {
  APIKey = 'API_KEY',
  AmazonCognitoUserPools = 'AMAZON_COGNITO_USER_POOLS',
  AwsIam = 'AWS_IAM',
  AwsLambda = 'AWS_LAMBDA',
  OpenidConnect = 'OPENID_CONNECT',
}

/**
 * Outputs generated from defineStorage
 */
export type Storage = {
  buckets?: Bucket[];
};

export type Bucket = {
  aws_region?: AwsRegion;
  name?: string;
  prefixes?: string[];
  [property: string]: any;
};
