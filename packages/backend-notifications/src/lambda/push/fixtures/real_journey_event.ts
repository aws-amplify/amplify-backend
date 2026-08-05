/* eslint-disable spellcheck/spell-checker -- anonymized sample Connect journey event (UUIDs, hashes, PII-shaped test data) */
/* eslint-disable @typescript-eslint/naming-convention -- Amazon Connect batch custom-action wire envelope is PascalCase by contract. */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Real-shaped Amazon Connect Outbound Campaigns v2 journey invocation event.
 *
 * Shape captured from a live Connect journey run; identifiers anonymized (the
 * campaign id is a placeholder and the source log group / request id have been
 * removed — nothing here points at a real deployment).
 *
 * This is the AUTHORITATIVE fixture for the real journey envelope: `Items` is an
 * OBJECT { CustomerProfiles: [...] }, each entry's `CustomerData` is a
 * SERIALIZED JSON STRING with camelCase keys, `ProfileId` is top-level
 * PascalCase, and there is an `IdempotencyToken`. Preserve this shape exactly if
 * you refresh the sample.
 *
 * OWNERSHIP MODEL: the ONLY key the push Lambda routes / gates delivery on is
 * `CustomerData.attributes.principalId` (see push `event.ts::extractPrincipalId`).
 * It does NOT read `cognitoSub` / `cognitoUserKey` / `deviceId`, so each profile's
 * attributes carry a `principalId` (the Identity Pool identityId the identify
 * Lambda mirrors onto the Customer Profile) plus incidental personalization
 * attributes only. Device tokens are always resolved authoritatively from the
 * DynamoDB Devices table via the GSI(principalId), never from this event.
 */
const REAL_JOURNEY_CUSTOMER_PROFILES: Array<{
  ProfileId: string;
  CustomerData: Record<string, unknown>;
  IdempotencyToken: string;
}> = [
  {
    ProfileId: 'b1a19259aff1472fa4e4332b4f2ba441',
    CustomerData: {
      profileId: 'b1a19259aff1472fa4e4332b4f2ba441',
      attributes: {
        principalId: 'us-east-1:11111111-1111-4111-8111-111111111111',
      },
    },
    IdempotencyToken:
      '3709179dfad1fa981d2388a8c0fef99df26dd45b3c1725d097564239337c45e4',
  },
  {
    ProfileId: 'eb155c66aae14a10b775437c40a4e44d',
    CustomerData: {
      profileId: 'eb155c66aae14a10b775437c40a4e44d',
      firstName: 'Manual',
      lastName: 'Tester',
      emailAddress: 'manual-test@example.com',
      attributes: {
        principalId: 'us-east-1:22222222-2222-4222-8222-222222222222',
        appUserId: 'manual-test-user',
        appVersion: '1.0.0',
        plan: 'premium',
        platform: 'android',
      },
    },
    IdempotencyToken:
      '2ec09dbd1477f39e1feeed32c9f6dc882a152d98d0096d2e36b5a9c900f05f00',
  },
  {
    ProfileId: '980662c93bdd4527aeecbacc1aae296a',
    CustomerData: {
      profileId: '980662c93bdd4527aeecbacc1aae296a',
      firstName: 'Ada',
      lastName: 'Lovelace',
      emailAddress: 'ada@example.com',
      address: {
        city: 'Seattle',
        province: 'WA',
        country: 'US',
        postalCode: '98101',
      },
      attributes: {
        principalId: 'us-east-1:33333333-3333-4333-8333-333333333333',
        appUserId: 'app-user-1',
        appVersion: '1.2.3',
        locale: 'en_US',
        plan: 'premium',
        platform: 'ios',
      },
    },
    IdempotencyToken:
      '64396f1aca4c1db9d2fb729102140a2e4250e4503659f1d047b9fca9987a7f38',
  },
  {
    ProfileId: '594a41c0a6d84f46a56df716a3f62e7d',
    CustomerData: {
      profileId: '594a41c0a6d84f46a56df716a3f62e7d',
      firstName: 'Grace',
      lastName: 'Hopper',
      emailAddress: 'grace@example.com',
      attributes: {
        principalId: 'us-east-1:44444444-4444-4444-8444-444444444444',
        appUserId: 'app-user-2',
        plan: 'basic',
      },
    },
    IdempotencyToken:
      'b7c8133e2ce51ed8aebb74ec65237f39090864df601fbac864fc8211e0564829',
  },
];

/** The verbatim real journey event, as a JS object (canonical envelope shape). */
export const REAL_JOURNEY_EVENT: unknown = {
  InvocationMetadata: {
    CampaignContext: {
      CampaignId: '00000000-0000-4000-8000-000000000000',
      RunId: '00000000-0000-4000-8000-000000000000#2026-07-03T10-04-00Z',
      ActionId: 'Push Notification',
      CampaignName: 'journey-2',
    },
  },
  Items: {
    CustomerProfiles: REAL_JOURNEY_CUSTOMER_PROFILES.map((entry) => ({
      ProfileId: entry.ProfileId,
      // The real journey delivers CustomerData as a SERIALIZED JSON STRING with
      // camelCase keys; preserve that exactly (it is `JSON.parse`d by the parser).
      CustomerData: JSON.stringify(entry.CustomerData),
      IdempotencyToken: entry.IdempotencyToken,
    })),
  },
};

/** The verbatim real journey event, serialized (source-log reference form). */
export const REAL_JOURNEY_EVENT_RAW: string =
  JSON.stringify(REAL_JOURNEY_EVENT);

/**
 * The Amazon Connect batch response the push Lambda MUST return for
 * {@link REAL_JOURNEY_EVENT} when every one of the 4 profiles resolves to no
 * registered devices (the deterministic outcome when the Devices table has no
 * entries for their principalIds): exactly one `CustomerProfiles` entry per
 * requested `ProfileId`, keyed by `Id`, each `skipped` with reason `no_devices`.
 *
 * This documents the CONTRACT shape ({ Items: { CustomerProfiles: [{ Id,
 * ResultData }] } }) — one entry per requested ProfileId, `Id` === ProfileId.
 */
export const REAL_JOURNEY_EXPECTED_RESPONSE_NO_DEVICES = {
  Items: {
    CustomerProfiles: [
      'b1a19259aff1472fa4e4332b4f2ba441',
      'eb155c66aae14a10b775437c40a4e44d',
      '980662c93bdd4527aeecbacc1aae296a',
      '594a41c0a6d84f46a56df716a3f62e7d',
    ].map((profileId) => ({
      Id: profileId,
      ResultData: { status: 'skipped', reason: 'no_devices' },
    })),
  },
};
