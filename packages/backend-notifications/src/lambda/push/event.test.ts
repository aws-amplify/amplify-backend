// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePushEvent } from './event.js';
import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../../constants.js';
import { REAL_JOURNEY_EVENT } from './fixtures/real_journey_event.js';

void describe('parsePushEvent — canonical Items.CustomerProfiles[] targets', () => {
  void it('parses the canonical Items-as-object CustomerProfiles array', () => {
    const { targets, parsePath } = parsePushEvent({
      Items: {
        CustomerProfiles: [
          { ProfileId: 'p1', CustomerData: '{"plan":"premium"}' },
          { ProfileId: 'p2' },
        ],
      },
    });
    assert.strictEqual(parsePath, 'canonical');
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['p1', 'p2'],
    );
    assert.deepStrictEqual(targets[0].customerData, { plan: 'premium' });
    assert.strictEqual(targets[1].customerData, undefined);
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

  void it('reports canonical when targets resolve, none otherwise', () => {
    assert.strictEqual(
      parsePushEvent({ Items: { CustomerProfiles: [{ ProfileId: 'p1' }] } })
        .parsePath,
      'canonical',
    );
    assert.strictEqual(parsePushEvent({}).parsePath, 'none');
    assert.strictEqual(parsePushEvent(undefined).parsePath, 'none');
    // An array Items (a shape real Connect never sends) yields no targets.
    assert.strictEqual(
      parsePushEvent({ Items: [{ CustomerProfiles: [{ ProfileId: 'p1' }] }] })
        .parsePath,
      'none',
    );
  });
});

void describe('parsePushEvent — REAL Connect Outbound-Campaigns-v2 journey shape', () => {
  // Authoritative fixture: the verbatim rawEvent captured from a live journey
  // run (see fixtures/real_journey_event.ts for the source log reference).
  // Expected values are derived from the fixture (via bracket access, no
  // re-typed identifiers) so the assertions prove the parser's transformations
  // rather than restating literals.
  const asRec = (v: unknown): Record<string, unknown> =>
    v as Record<string, unknown>;
  const root = asRec(REAL_JOURNEY_EVENT);
  const rawEntries = asRec(root['Items'])['CustomerProfiles'] as unknown[];
  const rawCtx = asRec(asRec(root['InvocationMetadata'])['CampaignContext']);

  void it('resolves all 4 profiles with correct top-level ProfileIds (Items-as-object)', () => {
    const { targets, parsePath } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.strictEqual(targets.length, 4);
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      rawEntries.map((e) => asRec(e)['ProfileId'] as string),
    );
    assert.strictEqual(parsePath, 'canonical');
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

  void it('extracts InvocationMetadata.CampaignContext (PascalCase -> camelCase)', () => {
    const { campaign } = parsePushEvent(REAL_JOURNEY_EVENT);
    assert.deepStrictEqual(campaign, {
      campaignId: rawCtx['CampaignId'],
      campaignName: rawCtx['CampaignName'],
      actionId: rawCtx['ActionId'],
      runId: rawCtx['RunId'],
    });
    assert.strictEqual(typeof campaign?.campaignId, 'string');
    assert.ok((campaign?.campaignId?.length ?? 0) > 0);
    assert.strictEqual(campaign?.campaignName, 'journey-2');
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
    assert.strictEqual(message.data, undefined);
  });
});
