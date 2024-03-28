/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Amazon Cognito standard attributes for users -- https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
 */
export type AmazonCognitoStandardAttributes =
  | 'address'
  | 'birthdate'
  | 'email'
  | 'family_name'
  | 'gender'
  | 'given_name'
  | 'locale'
  | 'middle_name'
  | 'name'
  | 'nickname'
  | 'phone_number'
  | 'picture'
  | 'preferred_username'
  | 'profile'
  | 'sub'
  | 'updated_at'
  | 'website'
  | 'zoneinfo';
export type AwsRegion = string;
/**
 * List of supported auth types for AWS AppSync
 */
export type AwsAppsyncAuthorizationType =
  | 'AMAZON_COGNITO_USER_POOLS'
  | 'API_KEY'
  | 'AWS_IAM'
  | 'AWS_LAMBDA'
  | 'OPENID_CONNECT';
/**
 * supported channels for Amazon Pinpoint
 */
export type AmazonPinpointChannels =
  | 'IN_APP_MESSAGING'
  | 'FCM'
  | 'APNS'
  | 'EMAIL'
  | 'SMS';

/**
 * Config format for Amplify Gen 2 client libraries to communicate with backend services.
 */
export interface AWSAmplifyBackendOutputs {
  /**
   * Version of this schema
   */
  version: '1';
  /**
   * Outputs manually specified by developers for use with frontend library
   */
  analytics?: {
    amazon_pinpoint?: {
      /**
       * AWS Region of Amazon Pinpoint resources
       */
      aws_region: AwsRegion;
      app_id: string;
    };
  };
  /**
   * Outputs generated from defineAuth
   */
  auth?: {
    /**
     * AWS Region of Amazon Cognito resources
     */
    aws_region: AwsRegion;
    /**
     * Authentication flow types
     */
    authentication_flow_type?: 'USER_SRP_AUTH' | 'CUSTOM_AUTH';
    /**
     * Cognito User Pool ID
     */
    user_pool_id: string;
    /**
     * Cognito User Pool Client ID
     */
    user_pool_client_id: string;
    /**
     * Cognito Identity Pool ID
     */
    identity_pool_id?: string;
    /**
     * Cognito User Pool password policy
     */
    password_policy?: {
      min_length?: number;
      require_numbers?: boolean;
      require_lowercase?: boolean;
      require_uppercase?: boolean;
      require_symbols?: boolean;
    };
    oauth?: {
      /**
       * Identity providers set on Cognito User Pool
       *
       * @minItems 0
       */
      identity_providers: (
        | 'GOOGLE'
        | 'FACEBOOK'
        | 'LOGIN_WITH_AMAZON'
        | 'SIGN_IN_WITH_APPLE'
      )[];
      /**
       * Cognito Domain used for identity providers
       */
      domain?: string;
      /**
       * @minItems 0
       */
      scopes: string[];
      /**
       * URIs used to redirect after signing in using an identity provider
       *
       * @minItems 1
       */
      redirect_sign_in_uri: string[];
      /**
       * URIs used to redirect after signing out
       *
       * @minItems 1
       */
      redirect_sign_out_uri: string[];
      response_type: 'code' | 'token';
    };
    /**
     * Cognito User Pool standard attributes required for signup
     *
     * @minItems 0
     */
    standard_required_attributes?: AmazonCognitoStandardAttributes[];
    /**
     * Cognito User Pool username attributes
     *
     * @minItems 1
     */
    username_attributes?: ('email' | 'phone_number' | 'username')[];
    user_verification_types?: ('email' | 'phone_number')[];
    unauthenticated_identities_enabled?: boolean;
    mfa_configuration?: 'NONE' | 'OPTIONAL' | 'REQUIRED';
    mfa_methods?: ('SMS' | 'TOTP')[];
  };
  /**
   * Outputs generated from defineData
   */
  data?: {
    aws_region: AwsRegion;
    /**
     * AppSync endpoint URL
     */
    url: string;
    /**
     * generated model introspection schema for use with generateClient
     */
    model_introspection?: {
      [k: string]: unknown;
    };
    api_key?: string;
    default_authorization_type: AwsAppsyncAuthorizationType;
    authorization_types: AwsAppsyncAuthorizationType[];
  };
  /**
   * Outputs manually specified by developers for use with frontend library
   */
  geo?: {
    /**
     * AWS Region of Amazon Location Service resources
     */
    aws_region: AwsRegion;
    /**
     * Maps from Amazon Location Service
     */
    maps?: {
      items: {
        [k: string]: AmazonLocationServiceConfig;
      };
      default: string;
    };
    /**
     * Location search (search by places, addresses, coordinates)
     */
    search_indices?: {
      items: string[];
      default: string;
    };
    /**
     * Geofencing (visualize virtual perimeters)
     */
    geofence_collections?: {
      items: string[];
      default: string;
    };
  };
  /**
   * Outputs manually specified by developers for use with frontend library
   */
  notifications?: {
    aws_region: AwsRegion;
    amazon_pinpoint_app_id: string;
    /**
     * @minItems 1
     */
    channels: AmazonPinpointChannels[];
  };
  /**
   * Outputs generated from defineStorage
   */
  storage?: {
    aws_region: AwsRegion;
    bucket_name: string;
  };
  /**
   * Outputs generated from backend.addOutput({ custom: <config> })
   */
  custom?: {
    [k: string]: unknown;
  };
}
/**
 * This interface was referenced by `undefined`'s JSON-Schema definition
 * via the `patternProperty` ".*".
 */
export interface AmazonLocationServiceConfig {
  /**
   * Map resource name
   */
  name?: string;
  /**
   * Map style
   */
  style?: string;
}
