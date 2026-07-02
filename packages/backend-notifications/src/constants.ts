/**
 * Shared constants describing the Customer Profiles object model.
 *
 * Referenced by BOTH the CDK object-type definitions and the Lambda handler,
 * so they must stay in lockstep.
 */

/** Profile object type. Declares the searchable identity key + attr schema. */
export const OBJECT_TYPE_PROFILE = 'AmplifyProfile';

/** Device object type. One object per stable deviceId; token is a field. */
export const OBJECT_TYPE_DEVICE = 'AmplifyDevice';

/**
 * Searchable profile key that binds a profile to a verified Cognito subject.
 * Profiles are looked up by THIS key (SearchProfiles), never by the Attributes
 * map. The same key name is used as the PROFILE-resolution key on the device
 * object type so device objects merge into the correct profile.
 */
export const COGNITO_USER_KEY = 'cognitoUserKey';

/** Max length of a Customer Profiles attribute value (single string). */
export const MAX_ATTRIBUTE_LENGTH = 255;

/** Environment variable carrying the Customer Profiles domain name. */
export const ENV_DOMAIN_NAME = 'PROFILES_DOMAIN_NAME';

/** Default Customer Profiles domain name created when none is supplied. */
export const DEFAULT_DOMAIN_NAME = 'AmplifyIdentifyUserPoc';

/** Default profile / object-type expiration in days. */
export const DEFAULT_EXPIRATION_DAYS = 366;

/**
 * Default key under `custom` in `amplify_outputs.json` where the notifications
 * endpoint / region are surfaced to the client.
 */
export const DEFAULT_OUTPUT_KEY = 'CustomerProfiles';
