import type { CfnObjectType } from 'aws-cdk-lib/aws-customerprofiles';
import {
  OBJECT_TYPE_PROFILE,
  PRINCIPAL_ID_FIELD,
  PRINCIPAL_ID_KEY,
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
 * AmplifyProfile — the sole person profile object type, keyed on the
 * source-agnostic `principalId` (= the Cognito Identity Pool `cognitoIdentityId`
 * today, populated for BOTH authenticated and unauthenticated/guest callers).
 *
 * Single searchable identity key `principalIdKey` (PROFILE + UNIQUE) sourced
 * from the ingested `principalId` field. The Lambda ingests a minimal
 * `{principalId}` object via PutProfileObject purely for the atomic
 * find-or-create by that UNIQUE key; person / targeting attributes are written
 * separately by UpdateProfile.
 *
 * `allowProfileCreation` stays true so ingesting an object with a new
 * `principalId` creates the profile, and re-ingesting an existing one resolves
 * to it in place. There is NO guest object type and NO auth/guest branching — a
 * guest is simply an unauthenticated `principalId` on the same object type.
 */
export const AMPLIFY_PROFILE_FIELDS: FieldMap[] = [
  field(
    PRINCIPAL_ID_FIELD,
    PRINCIPAL_ID_FIELD,
    '_profile.Attributes.principalId',
  ),
];

export const AMPLIFY_PROFILE_KEYS: KeyMap[] = [
  {
    // Searchable identity key: SearchProfiles(principalIdKey, ...).
    name: PRINCIPAL_ID_KEY,
    objectTypeKeyList: [
      {
        standardIdentifiers: ['PROFILE', 'UNIQUE'],
        fieldNames: [PRINCIPAL_ID_FIELD],
      },
    ],
  },
];

export const OBJECT_TYPE_NAMES = {
  profile: OBJECT_TYPE_PROFILE,
};
