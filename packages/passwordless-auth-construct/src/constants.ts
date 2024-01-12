/**
 * A placeholder for the code or link in messages.
 */
export const codeOrLinkPlaceholder = '##codeOrLink##';

/**
 * Cogito metadata keys that the client is required to provide when invoking
 * Cognito RespondToAuthChallenge in passwordless auth.
 *
 * See Cogntio docs for more info on client provided metadata: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html#CognitoUserPools-RespondToAuthChallenge-request-ClientMetadata
 *
 * The keys below will be provided by the amplify client library, but the customer
 * can optionally provide their own keys for flows besides passwordles auth. To
 * prevent collisions with keys provided by the customer the keys are prefixed
 * with "Amplify.Passwordless"
 */
export enum CognitoMetadataKeys {
  ACTION = 'Amplify.Passwordless.action',
  DELIVERY_MEDIUM = 'Amplify.Passwordless.deliveryMedium',
  REDIRECT_URI = 'Amplify.Passwordless.redirectUri',
  SIGN_IN_METHOD = 'Amplify.Passwordless.signInMethod',
}

/**
 * Custom user Attribute name for passwordless sign up feature
 */
export const PASSWORDLESS_SIGN_UP_ATTR_NAME = 'custom:passwordless_sign_up';
