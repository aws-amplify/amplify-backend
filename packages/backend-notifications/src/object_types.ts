import type { CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import {
  COGNITO_USER_KEY,
  OBJECT_TYPE_DEVICE,
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
 * AmplifyProfile — the person profile object type.
 *
 * Its ONLY role is to DECLARE the searchable identity key `cognitoUserKey`
 * (PROFILE + UNIQUE, sourced from the verified Cognito sub). The Lambda ingests
 * a minimal `{ cognitoSub }` object via PutProfileObject purely for the atomic
 * find-or-create by that key; person / targeting attributes are written
 * separately by UpdateProfile. So the object type maps only the single field
 * the resolution key needs — no redundant attribute mappings.
 *
 * `allowProfileCreation` stays true so the PutProfileObject find-or-create
 * works: ingesting an object with a new `cognitoUserKey` value creates the
 * profile, and re-ingesting an existing one resolves to it in place.
 */
export const AMPLIFY_PROFILE_FIELDS: FieldMap[] = [
  field('cognitoSub', 'cognitoSub', '_profile.Attributes.cognitoSub'),
];

export const AMPLIFY_PROFILE_KEYS: KeyMap[] = [
  {
    // Searchable identity key: SearchProfiles(KeyName='cognitoUserKey', ...).
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
 * namespace), so both keys map into `_profile.Attributes.*`. The
 * profile-resolution key = `cognitoUserKey` (from `cognitoSub`, the verified
 * JWT sub) merges the device into the profile bound to that sub.
 */
export const AMPLIFY_DEVICE_FIELDS: FieldMap[] = [
  field('cognitoSub', 'cognitoSub', '_profile.Attributes.cognitoSub'),
  field('deviceId', 'deviceId', '_profile.Attributes.deviceId'),
];

export const AMPLIFY_DEVICE_KEYS: KeyMap[] = [
  {
    // Profile-resolution key: merges the device into the sub's profile.
    name: COGNITO_USER_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE'],
        fieldNames: ['cognitoSub'],
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
];

export const OBJECT_TYPE_NAMES = {
  profile: OBJECT_TYPE_PROFILE,
  device: OBJECT_TYPE_DEVICE,
};
