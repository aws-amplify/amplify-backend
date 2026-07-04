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

/**
 * Environment variable carrying the AWS End User Messaging / Pinpoint
 * application (project) id the push-delivery Lambda calls `SendMessages`
 * against.
 */
export const ENV_EUM_APPLICATION_ID = 'EUM_APPLICATION_ID';

/**
 * Environment variable gating verbose, PII-bearing diagnostic logs (the raw
 * invocation event and the rendered per-profile message copy). DEFAULT-OFF: the
 * default log path emits only PII-free operational signals. Set to `'true'` (or
 * `'1'`) ONLY for temporary debugging in a non-production account — never in
 * production, as the gated logs echo customer content.
 */
export const ENV_DEBUG_LOG = 'NOTIFICATIONS_DEBUG_LOG';

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
