// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

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

/**
 * Attribute keys that map to authoritative, server-controlled profile fields
 * (derived from {@link AMPLIFY_PROFILE_FIELDS}, currently `{ principalId }`).
 *
 * These are the identity/routing slots the push path resolves and gates on, so
 * a caller MUST NOT be able to set them via `userProfile.customAttributes` — a
 * spoofed `principalId` would otherwise land in `Attributes.principalId` and
 * redirect campaign pushes to a victim's devices. `validateIdentifyUser`
 * rejects requests carrying these keys; `buildProfileUpdate` also strips them
 * as a belt-and-suspenders safeguard. Derived from the mapping table so it
 * auto-tracks any future reserved fields.
 *
 * Matching is exact-case, which is sufficient: Customer Profiles attribute keys
 * are case-sensitive, so a differently-cased submission (e.g. `PrincipalId`)
 * lands in a distinct slot the push path never reads.
 * @internal
 */
export const RESERVED_ATTRIBUTE_KEYS: ReadonlySet<string> = (() => {
  const names = AMPLIFY_PROFILE_FIELDS.map((f) => f.name);
  if (names.some((name) => name === undefined)) {
    // Fail loudly at module load rather than silently shrink the guard set if a
    // future field is added without a `name`.
    throw new Error(
      'AMPLIFY_PROFILE_FIELDS: every entry must have a `name` to derive RESERVED_ATTRIBUTE_KEYS',
    );
  }
  return new Set(names as string[]);
})();
