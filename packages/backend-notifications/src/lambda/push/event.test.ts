// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePushEvent } from './event.js';
import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../../constants.js';
import { REAL_JOURNEY_EVENT } from './fixtures/real_journey_event.js';

void describe('parsePushEvent — principalId from CustomerData.attributes', () => {
  void it('extracts principalId from CustomerData.attributes.principalId', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          {
            ProfileId: 'p1',
            CustomerData: JSON.stringify({
              firstName: 'Ada',
              attributes: { principalId: 'us-east-1:abc-123', plan: 'premium' },
            }),
          },
        ],
      },
    });
    assert.strictEqual(targets[0].principalId, 'us-east-1:abc-123');
  });

  void it('leaves principalId undefined when the attribute is absent (profile skipped downstream)', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'p1', CustomerData: JSON.stringify({ attributes: {} }) },
          { ProfileId: 'p2', CustomerData: '{"firstName":"NoAttrs"}' },
        ],
      },
    });
    assert.strictEqual(targets[0].principalId, undefined);
    assert.strictEqual(targets[1].principalId, undefined);
  });
});

void describe('parsePushEvent — canonical Items.CustomerProfiles[] targets', () => {
  void it('parses the canonical Items-as-object CustomerProfiles array', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'p1', CustomerData: '{"plan":"premium"}' },
          { ProfileId: 'p2' },
        ],
      },
    });
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['p1', 'p2'],
    );
    assert.deepStrictEqual(targets[0].customerData, { plan: 'premium' });
    assert.strictEqual(targets[1].customerData, undefined);
  });

  void it('captures the per-item IdempotencyToken onto the target', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'p1', IdempotencyToken: 'tok-123' },
          { ProfileId: 'p2' },
        ],
      },
    });
    assert.strictEqual(targets[0].idempotencyToken, 'tok-123');
    assert.strictEqual(targets[1].idempotencyToken, undefined);
  });

  void it('skips entries with no ProfileId and ignores malformed input', () => {
    assert.deepStrictEqual(parsePushEvent(undefined).targets, []);
    assert.deepStrictEqual(parsePushEvent('nope').targets, []);
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [{ CustomerData: '{}' }, { ProfileId: '' }, 42],
      },
    });
    assert.deepStrictEqual(targets, []);
  });

  void it('resolves no targets for empty / malformed envelopes', () => {
    assert.strictEqual(parsePushEvent({}).targets.length, 0);
    assert.strictEqual(parsePushEvent(undefined).targets.length, 0);
    // An array Items (a shape real Connect never sends) yields no targets.
    assert.strictEqual(
      parsePushEvent({ Items: [{ CustomerProfiles: [{ ProfileId: 'p1' }] }] })
        .targets.length,
      0,
    );
  });
});

void describe('parsePushEvent — REAL Connect Outbound-Campaigns-v2 journey shape', () => {
  // Authoritative fixture: a real-shaped journey event with placeholder
  // identifiers (see fixtures/real_journey_event.ts). The profile-id assertion
  // below pins the EXPECTED ids as literals (an independent oracle, not
  // re-derived from the input); the IdempotencyToken / CustomerData assertions
  // read from the fixture to prove the parser's per-entry transformations.
  const asRec = (v: unknown): Record<string, unknown> =>
    v as Record<string, unknown>;
  const root = asRec(REAL_JOURNEY_EVENT);
  const rawEntries = asRec(root['Items'])['CustomerProfiles'] as unknown[];
  const rawCtx = asRec(asRec(root['InvocationMetadata'])['CampaignContext']);

  void it('resolves all 4 profiles with correct top-level ProfileIds (Items-as-object)', () => {
    const { targets } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.strictEqual(targets.length, 4);
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      [
        'b1a19259aff1472fa4e4332b4f2ba441',
        'eb155c66aae14a10b775437c40a4e44d',
        '980662c93bdd4527aeecbacc1aae296a',
        '594a41c0a6d84f46a56df716a3f62e7d',
      ],
    );
  });

  void it('captures each entry IdempotencyToken', () => {
    const { targets } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.deepStrictEqual(
      targets.map((t) => t.idempotencyToken),
      rawEntries.map((e) => asRec(e)['IdempotencyToken'] as string),
    );
  });

  void it('JSON.parses each serialized CustomerData string into the camelCase object', () => {
    const { targets } = parsePushEvent(REAL_JOURNEY_EVENT);

    // Every profile's CustomerData is the JSON.parse of the serialized string
    // (camelCase keys + nested attributes / address preserved).
    for (let i = 0; i < rawEntries.length; i++) {
      assert.deepStrictEqual(
        targets[i].customerData,
        JSON.parse(asRec(rawEntries[i])['CustomerData'] as string) as Record<
          string,
          unknown
        >,
      );
    }

    // Spot-check the camelCase shape explicitly (not PascalCase, not a string).
    const cd = targets[1].customerData as Record<string, unknown>;
    assert.strictEqual(cd.firstName, 'Manual');
    assert.strictEqual(cd.lastName, 'Tester');
    assert.strictEqual(cd.emailAddress, 'manual-test@example.com');
    const attrs = cd.attributes as Record<string, unknown>;
    assert.strictEqual(typeof attrs.cognitoSub, 'string');
    assert.strictEqual(attrs.deviceId, 'manual-test-gcm-device');
    assert.strictEqual(attrs.hasGCM, 'true');
    assert.strictEqual(attrs.hasAPNS, 'true');

    // Nested address object survives the parse (profile 3).
    const cd3 = targets[2].customerData as Record<string, unknown>;
    assert.deepStrictEqual(cd3.address, {
      city: 'Seattle',
      province: 'WA',
      country: 'US',
      postalCode: '98101',
    });
  });

  void it('extracts InvocationMetadata.CampaignContext (only campaignId + actionId)', () => {
    const { campaign } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.deepStrictEqual(campaign, {
      campaignId: rawCtx['CampaignId'],
      actionId: rawCtx['ActionId'],
    });
    assert.strictEqual(typeof campaign?.campaignId, 'string');
    assert.ok((campaign?.campaignId?.length ?? 0) > 0);
    assert.strictEqual(campaign?.actionId, 'Push Notification');
  });

  void it('has no per-profile message copy — message falls back to defaults', () => {
    const { message } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.strictEqual(message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(message.body, DEFAULT_PUSH_BODY);
  });
});

void describe('parsePushEvent — CustomerData coercion (minimal defensive handling)', () => {
  void it('JSON.parses a serialized-string CustomerData', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          {
            ProfileId: 'p1',
            CustomerData:
              '{"firstName":"Ada","attributes":{"cognitoSub":"s1"}}',
          },
        ],
      },
    });
    assert.deepStrictEqual(targets[0].customerData, {
      firstName: 'Ada',
      attributes: { cognitoSub: 's1' },
    });
  });

  void it('tolerates a CustomerData already given as a parsed object (no double-parse)', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'p1', CustomerData: { plan: 'premium' } },
        ],
      },
    });
    assert.deepStrictEqual(targets[0].customerData, { plan: 'premium' });
  });

  void it('tolerates a non-JSON / empty CustomerData string (undefined, target kept)', () => {
    const { targets } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'bad', CustomerData: 'not json' },
          { ProfileId: 'empty', CustomerData: '   ' },
        ],
      },
    });
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['bad', 'empty'],
    );
    assert.strictEqual(targets[0].customerData, undefined);
    assert.strictEqual(targets[1].customerData, undefined);
  });

  void it('leaves campaign undefined when no InvocationMetadata is present', () => {
    assert.strictEqual(
      parsePushEvent({ Items: { CustomerProfiles: [{ ProfileId: 'p1' }] } })
        .campaign,
      undefined,
    );
  });
});

void describe('parsePushEvent — message', () => {
  void it('always defaults title/body (message copy is resolved per profile downstream)', () => {
    const { message } = parsePushEvent({
      Items: { CustomerProfiles: [{ ProfileId: 'p1' }] },
    });
    assert.strictEqual(message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(message.body, DEFAULT_PUSH_BODY);
  });
});
