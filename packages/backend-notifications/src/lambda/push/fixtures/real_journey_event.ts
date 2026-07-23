/* eslint-disable spellcheck/spell-checker -- anonymized sample Connect journey event (UUIDs, hashes, PII-shaped test data) */
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
 */
export const REAL_JOURNEY_EVENT_RAW =
  '{"InvocationMetadata":{"CampaignContext":{"CampaignId":"00000000-0000-4000-8000-000000000000","RunId":"00000000-0000-4000-8000-000000000000#2026-07-03T10-04-00Z","ActionId":"Push Notification","CampaignName":"journey-2"}},"Items":{"CustomerProfiles":[{"ProfileId":"b1a19259aff1472fa4e4332b4f2ba441","CustomerData":"{\\"profileId\\":\\"b1a19259aff1472fa4e4332b4f2ba441\\",\\"attributes\\":{\\"cognitoSub\\":\\"push-e2e-sub-1783067414142\\",\\"deviceId\\":\\"dev-apns-1783067414142\\"}}","IdempotencyToken":"3709179dfad1fa981d2388a8c0fef99df26dd45b3c1725d097564239337c45e4"},{"ProfileId":"eb155c66aae14a10b775437c40a4e44d","CustomerData":"{\\"profileId\\":\\"eb155c66aae14a10b775437c40a4e44d\\",\\"firstName\\":\\"Manual\\",\\"lastName\\":\\"Tester\\",\\"emailAddress\\":\\"manual-test@example.com\\",\\"attributes\\":{\\"appUserId\\":\\"manual-test-user\\",\\"appVersion\\":\\"1.0.0\\",\\"cognitoSub\\":\\"74c824b8-9031-70bc-9e6c-e64660a34d32\\",\\"cognitoUserKey\\":\\"74c824b8-9031-70bc-9e6c-e64660a34d32\\",\\"deviceId\\":\\"manual-test-gcm-device\\",\\"hasAPNS\\":\\"true\\",\\"hasGCM\\":\\"true\\",\\"plan\\":\\"premium\\",\\"platform\\":\\"android\\"}}","IdempotencyToken":"2ec09dbd1477f39e1feeed32c9f6dc882a152d98d0096d2e36b5a9c900f05f00"},{"ProfileId":"980662c93bdd4527aeecbacc1aae296a","CustomerData":"{\\"profileId\\":\\"980662c93bdd4527aeecbacc1aae296a\\",\\"firstName\\":\\"Ada\\",\\"lastName\\":\\"Lovelace\\",\\"emailAddress\\":\\"ada@example.com\\",\\"address\\":{\\"city\\":\\"Seattle\\",\\"province\\":\\"WA\\",\\"country\\":\\"US\\",\\"postalCode\\":\\"98101\\"},\\"attributes\\":{\\"appUserId\\":\\"app-user-1\\",\\"appVersion\\":\\"1.2.3\\",\\"cognitoSub\\":\\"5498b4a8-30e1-7034-f334-15520531a361\\",\\"cognitoUserKey\\":\\"5498b4a8-30e1-7034-f334-15520531a361\\",\\"deviceId\\":\\"verify-device-0001\\",\\"hasAPNS\\":\\"true\\",\\"locale\\":\\"en_US\\",\\"plan\\":\\"premium\\",\\"platform\\":\\"ios\\"}}","IdempotencyToken":"64396f1aca4c1db9d2fb729102140a2e4250e4503659f1d047b9fca9987a7f38"},{"ProfileId":"594a41c0a6d84f46a56df716a3f62e7d","CustomerData":"{\\"profileId\\":\\"594a41c0a6d84f46a56df716a3f62e7d\\",\\"firstName\\":\\"Grace\\",\\"lastName\\":\\"Hopper\\",\\"emailAddress\\":\\"grace@example.com\\",\\"attributes\\":{\\"appUserId\\":\\"app-user-2\\",\\"cognitoSub\\":\\"b4780458-0061-70e3-a5a4-3b76098dc0bb\\",\\"cognitoUserKey\\":\\"b4780458-0061-70e3-a5a4-3b76098dc0bb\\",\\"deviceId\\":\\"verify-device-u2\\",\\"hasGCM\\":\\"true\\",\\"plan\\":\\"basic\\"}}","IdempotencyToken":"b7c8133e2ce51ed8aebb74ec65237f39090864df601fbac864fc8211e0564829"}]}}';

/** The verbatim real journey event, parsed into a JS object. */
export const REAL_JOURNEY_EVENT: unknown = JSON.parse(REAL_JOURNEY_EVENT_RAW);

/**
 * The Amazon Connect batch response the push Lambda MUST return for
 * {@link REAL_JOURNEY_EVENT} when every one of the 4 profiles has no registered
 * devices (the deterministic outcome when Customer Profiles is stubbed empty):
 * exactly one `CustomerProfiles` entry per requested `ProfileId`, keyed by `Id`,
 * each `skipped` with reason `no_devices`.
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
