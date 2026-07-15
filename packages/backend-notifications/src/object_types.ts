import type { CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import {
  COGNITO_IDENTITY_FIELD,
  COGNITO_IDENTITY_KEY,
  COGNITO_USER_KEY,
  DEVICE_SEARCH_KEY,
  OBJECT_TYPE_DEVICE,
  OBJECT_TYPE_GUEST_PROFILE,
  OBJECT_TYPE_PROFILE,
} from './constants.js';

export type FieldMap = CfnObjectType.FieldMapProperty;
export type KeyMap = CfnObjectType.KeyMapProperty;

const field = (name: string, source: string, target: string): FieldMap => ({
  name,
  objectTypeField: {
    contentType: 'STRING',
    source: `_source.${source}`,
    target,
  },
});

/**
 * AmplifyProfile — the AUTHENTICATED person profile object type.
 *
 * Single searchable identity key `cognitoUserKey` (PROFILE + UNIQUE) sourced
 * from `cognitoSub`. The Lambda ingests a minimal `{cognitoSub}` object via
 * PutProfileObject purely for the atomic find-or-create by that UNIQUE key;
 * person / targeting attributes are written separately by UpdateProfile.
 *
 * `allowProfileCreation` stays true so ingesting an object with a new
 * `cognitoSub` creates the profile, and re-ingesting an existing one resolves
 * to it in place. (Customer Profiles requires the ingested object to carry the
 * object type's UNIQUE key — the reason guest profiles need their own type.)
 */
export const AMPLIFY_PROFILE_FIELDS: FieldMap[] = [
  field('cognitoSub', 'cognitoSub', '_profile.Attributes.cognitoSub'),
];

export const AMPLIFY_PROFILE_KEYS: KeyMap[] = [
  {
    // Searchable AUTHENTICATED identity key: SearchProfiles(cognitoUserKey,...).
    name: COGNITO_USER_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE', 'UNIQUE'],
        fieldNames: ['cognitoSub'],
      },
    ],
  },
];

/**
 * AmplifyGuestProfile — the GUEST person profile object type.
 *
 * A distinct object type is required: Customer Profiles allows EXACTLY ONE
 * `UNIQUE` key per object type and `PutProfileObject` rejects an object that
 * does not carry that UNIQUE key. The authed `AmplifyProfile` reserves its
 * UNIQUE key for `cognitoSub`, so guest profiles get their own type whose
 * single UNIQUE key is `cognitoIdentityKey`, sourced from the Identity Pool
 * `cognitoIdentityId` (e.g. `us-east-1:<uuid>`).
 *
 * Guest profiles are created in the SAME domain but are kept COMPLETELY SEPARATE
 * from authenticated profiles: there is NO profile merge. Push continuity across
 * sign-in is preserved by re-registering the device on the authenticated profile
 * and evicting the same deviceId from every other profile (see device_evictor);
 * guest profiles are reaped by their own shorter TTL.
 */
export const AMPLIFY_GUEST_PROFILE_FIELDS: FieldMap[] = [
  field(
    COGNITO_IDENTITY_FIELD,
    COGNITO_IDENTITY_FIELD,
    '_profile.Attributes.cognitoIdentityId',
  ),
];

export const AMPLIFY_GUEST_PROFILE_KEYS: KeyMap[] = [
  {
    // Searchable GUEST identity key: SearchProfiles(cognitoIdentityKey,...).
    // The single UNIQUE key on the guest object type.
    name: COGNITO_IDENTITY_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE', 'UNIQUE'],
        fieldNames: [COGNITO_IDENTITY_FIELD],
      },
    ],
  },
];

/**
 * AmplifyDevice — one object per stable device.
 *
 * UNIQUE object key = `deviceId` (stable), so a push-token refresh for the same
 * device upserts the same object in place. The full ingested object carries the
 * device schema: `deviceToken` (mutable push token), `channelType`, `platform`,
 * `appVersion`, `createdAt` (immutable first-registration time, preserved
 * across writes by the handler) and `updatedAt` (server-set on every write).
 * Those non-key fields are NOT mapped to a target: Customer Profiles stores the
 * ingested object verbatim and returns it from ListProfileObjects, so they
 * survive refreshes without a field mapping. Only the key fields need targets,
 * and CP requires targets under a reserved namespace (there is no `_object.*`
 * namespace), so the keys map into `_profile.Attributes.*`.
 *
 * TWO profile-resolution keys (both PROFILE, not UNIQUE) let a device merge into
 * EITHER the authed profile (via `cognitoUserKey` from `cognitoSub`) or the
 * GUEST profile (via `cognitoIdentityKey` from `cognitoIdentityId`), depending
 * on which identity field the ingested object carries. The object always
 * carries the UNIQUE `deviceId`, so ingestion is valid for both.
 *
 * A fourth key `deviceSearchKey` (SECONDARY, on `deviceId`) makes the same
 * device searchable ACROSS profiles: `SearchProfiles(deviceSearchKey,
 * [deviceId])` returns every profile carrying the device, which the
 * authenticated identify path uses to evict the device from stale profiles at
 * sign-in. SECONDARY keys are stored/searchable but only consulted as a fallback
 * during ingestion matching, so — because the primary cognito PROFILE key always
 * resolves the pre-created profile first — it never binds a device to the wrong
 * profile. (A LOOKUP_ONLY key would NOT be searchable: its value is not stored.)
 */
export const AMPLIFY_DEVICE_FIELDS: FieldMap[] = [
  field('cognitoSub', 'cognitoSub', '_profile.Attributes.cognitoSub'),
  field(
    COGNITO_IDENTITY_FIELD,
    COGNITO_IDENTITY_FIELD,
    '_profile.Attributes.cognitoIdentityId',
  ),
  field('deviceId', 'deviceId', '_profile.Attributes.deviceId'),
];

export const AMPLIFY_DEVICE_KEYS: KeyMap[] = [
  {
    // Profile-resolution key (authed): merges the device into the sub's profile.
    name: COGNITO_USER_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE'],
        fieldNames: ['cognitoSub'],
      },
    ],
  },
  {
    // Profile-resolution key (guest): merges the device into the guest profile.
    name: COGNITO_IDENTITY_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE'],
        fieldNames: [COGNITO_IDENTITY_FIELD],
      },
    ],
  },
  {
    // Stable unique object key: token refresh updates this object in place.
    name: 'deviceId',
    objectTypeKeyList: [
      {
        standardIdentifiers: ['UNIQUE'],
        fieldNames: ['deviceId'],
      },
    ],
  },
  {
    // Cross-profile search key (SECONDARY on deviceId): makes the device
    // searchable across profiles via SearchProfiles(deviceSearchKey, [deviceId])
    // so the authenticated identify path can evict it from stale profiles at
    // sign-in. SECONDARY is stored/searchable but only a fallback matcher, so it
    // never resolves/binds a device to a profile (the primary cognito key wins).
    name: DEVICE_SEARCH_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['SECONDARY'],
        fieldNames: ['deviceId'],
      },
    ],
  },
];

export const OBJECT_TYPE_NAMES = {
  profile: OBJECT_TYPE_PROFILE,
  guestProfile: OBJECT_TYPE_GUEST_PROFILE,
  device: OBJECT_TYPE_DEVICE,
};
