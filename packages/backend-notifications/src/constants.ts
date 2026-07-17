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
 * device object type so a guest's device objects resolve to the guest profile.
 *
 * Guest and authenticated profiles are kept COMPLETELY SEPARATE: there is NO
 * profile merge. Push continuity across sign-in is preserved by re-registering
 * the device on the authenticated profile and evicting the same `deviceId` from
 * every other profile (see device_evictor); guest profiles are reaped by their
 * own TTL (see {@link GUEST_EXPIRATION_DAYS}).
 */
export const COGNITO_IDENTITY_KEY = 'cognitoIdentityKey';

export const COGNITO_IDENTITY_FIELD = 'cognitoIdentityId';

export const COGNITO_SUB_FIELD = 'cognitoSub';

/**
 * Searchable SECONDARY key on the device object type. Maps the stable
 * `deviceId` so `SearchProfiles(KeyName=deviceSearchKey, Values=[deviceId])`
 * returns EVERY profile currently carrying that device. Used at authenticated
 * sign-in to evict the device from stale profiles (see device_evictor).
 *
 * SECONDARY (not PROFILE): the key value IS stored/associated with the profile
 * so it is searchable, but it is only consulted as a FALLBACK during ingestion
 * matching. Because a device object is always ingested with a verified identity
 * field whose PROFILE key (cognitoUserKey / cognitoIdentityKey) resolves the
 * pre-created profile first, the SECONDARY deviceId key never drives matching
 * and so can never merge two identities' profiles. A plain LOOKUP_ONLY key is
 * NOT searchable (its value is not stored), which is why SECONDARY is used.
 */
export const DEVICE_SEARCH_KEY = 'deviceSearchKey';

/** Max length of a Customer Profiles attribute value (single string). */
export const MAX_ATTRIBUTE_LENGTH = 255;

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

export const DEFAULT_PUSH_TITLE = 'Notification';

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

/** Guest TTL: whole-profile Customer Profiles expiry (no reaper Lambda); shorter than authed because guest identities are ephemeral. */
export const GUEST_EXPIRATION_DAYS = 90;

/**
 * Outbound Campaigns v2 <-> Customer Profiles object-type routing map. This
 * label map binds a campaign channel to the BUILT-IN Customer Profiles object
 * template of the same name; it is a routing/label map, NOT a set of object
 * types that must be pre-created via PutProfileObjectType. The same map is
 * supplied to BOTH `connectcampaignsv2:PutConnectInstanceIntegration` (as
 * `integrationConfig.customerProfiles.objectTypeNames`) and
 * `customer-profiles:PutIntegration` (as `ObjectTypeNames`) so Connect Journeys
 * can target the domain's profiles.
 */
export const CAMPAIGN_OBJECT_TYPE_NAMES = {
  'Campaign-Email': 'Campaign-Email',
  'Campaign-SMS': 'Campaign-SMS',
  'Campaign-Telephony': 'Campaign-Telephony',
  'Campaign-Orchestration': 'Campaign-Orchestration',
} as const;

/**
 * Environment variable carrying the Amazon Connect instance id the campaign
 * -association custom resource onboards to Outbound Campaigns v2 and associates
 * the created Customer Profiles domain with.
 */
export const ENV_CONNECT_INSTANCE_ID = 'CONNECT_INSTANCE_ID';

/** AWS service principal that owns the Outbound Campaigns service-linked role. */
export const CONNECT_CAMPAIGNS_SERVICE_NAME = 'connect-campaigns.amazonaws.com';

/** IAM path prefix under which the Outbound Campaigns service-linked role lives. */
export const CONNECT_CAMPAIGNS_SLR_PATH_PREFIX =
  '/aws-service-role/connect-campaigns.amazonaws.com/';

/**
 * Fixed key under the canonical `notifications` section of
 * `amplify_outputs.json` where the notifications endpoint / region are surfaced
 * to the client (`notifications.amazon_connect_customer_profiles`). This is the
 * exact path amplify-js reads in `parseAmplifyOutputs` (`parseNotifications`).
 *
 * This is intentionally NOT configurable: every first-party Amplify Gen2
 * resource (`defineAuth` / `defineData` / `defineStorage` / `defineFunction`)
 * writes its backend output to a fixed, well-known key rather than a
 * caller-chosen one, so the client config contributors know where to read it.
 * This resource follows the same convention with a single stable key.
 */
export const OUTPUT_KEY = 'amazon_connect_customer_profiles';
