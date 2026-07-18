import type { CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import {
  COGNITO_IDENTITY_FIELD,
  COGNITO_IDENTITY_KEY,
  COGNITO_USER_KEY,
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
 * sign-in is preserved by re-homing the device to the authenticated profile in
 * the DynamoDB Devices table (a strongly-consistent last-writer-wins write on
 * the `deviceId`); guest profiles are reaped by their own shorter TTL.
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

export const OBJECT_TYPE_NAMES = {
  profile: OBJECT_TYPE_PROFILE,
  guestProfile: OBJECT_TYPE_GUEST_PROFILE,
};
