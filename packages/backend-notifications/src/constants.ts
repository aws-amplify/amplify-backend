/**
 * Shared constants describing the Customer Profiles object model.
 *
 * Referenced by BOTH the CDK object-type definitions and the Lambda handler,
 * so they must stay in lockstep.
 */

/** Profile object type. Declares the searchable identity key + attr schema. */
export const OBJECT_TYPE_PROFILE = 'AmplifyProfile';

/**
 * Guest profile object type. A distinct object type is
 * required because Customer Profiles permits EXACTLY ONE `UNIQUE` key per object
 * type AND `PutProfileObject` requires the ingested object to carry that UNIQUE
 * key. The authed `AmplifyProfile` reserves its single UNIQUE key for
 * `cognitoSub`, so guest profiles — keyed on the Identity Pool `identityId` —
 * get their own object type whose UNIQUE key is `cognitoIdentityKey`. Both
 * object types create ordinary profiles in the SAME domain; the device object
 * type carries both identity keys as PROFILE keys so a device resolves to
 * whichever profile it belongs to.
 */
export const OBJECT_TYPE_GUEST_PROFILE = 'AmplifyGuestProfile';

/** Device object type. One object per stable deviceId; token is a field. */
export const OBJECT_TYPE_DEVICE = 'AmplifyDevice';

/**
 * Searchable profile key that binds a profile to a verified Cognito subject.
 * Profiles are looked up by THIS key (SearchProfiles), never by the Attributes
 * map. The same key name is used as the PROFILE-resolution key on the device
 * object type so device objects merge into the correct profile.
 */
export const COGNITO_USER_KEY = 'cognitoUserKey';

/**
 * Searchable profile key that binds a profile to an
 * UNAUTHENTICATED Cognito Identity Pool identity (the `cognitoIdentityId`, e.g.
 * `us-east-1:<uuid>`). A guest has no JWT `sub`, so its profile is keyed by this
 * key instead of {@link COGNITO_USER_KEY}. Also the PROFILE-resolution key on the
 * device object type so a guest's device objects merge into the guest profile.
 * On sign-in the guest profile is folded into the authed (sub-keyed) profile via
 * MergeProfiles (see merge_resolver).
 */
export const COGNITO_IDENTITY_KEY = 'cognitoIdentityKey';

/** Object field carrying the guest identity value (sourced into the key). */
export const COGNITO_IDENTITY_FIELD = 'cognitoIdentityId';

/** Object field carrying the authed identity value (sourced into the key). */
export const COGNITO_SUB_FIELD = 'cognitoSub';

/** Max length of a Customer Profiles attribute value (single string). */
export const MAX_ATTRIBUTE_LENGTH = 255;

/** Environment variable carrying the Customer Profiles domain name. */
export const ENV_DOMAIN_NAME = 'PROFILES_DOMAIN_NAME';

/**
 * Environment variable carrying the AWS End User Messaging / Pinpoint
 * application (project) id the push-delivery Lambda calls `SendMessages`
 * against.
 */
export const ENV_EUM_APPLICATION_ID = 'EUM_APPLICATION_ID';

/**
 * Amazon Connect integration type that binds a Q in Connect (Wisdom) knowledge
 * base — the store for message templates — to a Connect instance. Used by the
 * push Lambda's runtime knowledge-base discovery
 * (ListIntegrationAssociations filtered to this type).
 */
export const Q_MESSAGE_TEMPLATES_INTEGRATION_TYPE = 'Q_MESSAGE_TEMPLATES';

/**
 * Channel subtype of the Q in Connect message templates this backend renders.
 * Only PUSH templates are eligible for push-notification copy resolution.
 */
export const PUSH_CHANNEL_SUBTYPE = 'PUSH';

/**
 * Version qualifier appended to a message-template id to reference its ACTIVE
 * (published) version — e.g. `GetMessageTemplate(<id>:$ACTIVE_VERSION)`.
 */
export const ACTIVE_VERSION_QUALIFIER = '$ACTIVE_VERSION';

/** Default push-notification title when the event carries none. */
export const DEFAULT_PUSH_TITLE = 'Notification';

/** Default push-notification body when the event carries none. */
export const DEFAULT_PUSH_BODY = 'You have a new notification.';

/**
 * Service principals allowed to invoke the push-delivery Lambda via a
 * resource-based policy. Amazon Connect Journey Custom-actions invoke Lambda
 * under `connect.amazonaws.com`; Outbound Campaigns v2 uses
 * `connect-campaigns.amazonaws.com`. Granting both lets the customer's Journey
 * / campaign call the push Lambda without a broad wildcard principal.
 */
export const CONNECT_INVOKE_SERVICE_PRINCIPALS = [
  'connect.amazonaws.com',
  'connect-campaigns.amazonaws.com',
];

/** Default profile / object-type expiration in days. */
export const DEFAULT_EXPIRATION_DAYS = 366;

/**
 * Fixed key under `custom` in `amplify_outputs.json` where the notifications
 * endpoint / region are surfaced to the client (`custom.CustomerProfiles`).
 *
 * This is intentionally NOT configurable: every first-party Amplify Gen2
 * resource (`defineAuth` / `defineData` / `defineStorage` / `defineFunction`)
 * writes its backend output to a fixed, well-known key rather than a
 * caller-chosen one, so the client config contributors know where to read it.
 * This resource follows the same convention with a single stable key.
 */
export const OUTPUT_KEY = 'CustomerProfiles';
