// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  CustomerProfilesClient,
  DeleteProfileObjectCommandInput,
  Profile,
  SearchProfilesCommandInput,
} from '@aws-sdk/client-customer-profiles';

import { evictDeviceFromOtherProfiles } from './device_evictor.js';
import { DEVICE_SEARCH_KEY } from '../../constants.js';

const TOKEN = 'live-token';

type FakeDevice = { uniqueKey: string; deviceId?: string; token?: string };

/**
 * Fake CustomerProfilesClient that dispatches on command class name and drives
 * the REAL evictDeviceFromOtherProfiles -> listDevices/deleteDevice code path
 * (no network, no SDK mocking framework).
 *
 * - SearchProfiles returns `searchItems` (single page) or `searchPages` (paged
 *   via NextToken), or throws.
 * - ListProfileObjects returns the injected devices for the queried ProfileId
 *   (each serialized with deviceId + deviceToken).
 * - DeleteProfileObject records the input (or throws when `deleteThrows`).
 */
const fake = (opts: {
  searchItems?: Profile[];
  searchPages?: Profile[][];
  searchThrows?: boolean;
  devicesByProfile?: Record<string, FakeDevice[]>;
  deleteThrows?: boolean;
}): {
  client: CustomerProfilesClient;
  deletes: DeleteProfileObjectCommandInput[];
  searches: SearchProfilesCommandInput[];
  listedProfiles: string[];
} => {
  const deletes: DeleteProfileObjectCommandInput[] = [];
  const searches: SearchProfilesCommandInput[] = [];
  const listedProfiles: string[] = [];
  let searchCall = 0;
  const client = {
    send: (command: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'SearchProfilesCommand') {
        searches.push(command.input as unknown as SearchProfilesCommandInput);
        if (opts.searchThrows) {
          return Promise.reject(new Error('search failed'));
        }
        if (opts.searchPages) {
          const page = opts.searchPages[searchCall] ?? [];
          const hasNext = searchCall < opts.searchPages.length - 1;
          searchCall += 1;
          return Promise.resolve({
            Items: page,
            NextToken: hasNext ? `page-${searchCall}` : undefined,
          });
        }
        return Promise.resolve({ Items: opts.searchItems ?? [] });
      }
      if (name === 'ListProfileObjectsCommand') {
        const profileId = command.input.ProfileId as string;
        listedProfiles.push(profileId);
        const devices = opts.devicesByProfile?.[profileId] ?? [];
        return Promise.resolve({
          Items: devices.map((d) => ({
            ProfileObjectUniqueKey: d.uniqueKey,
            Object: JSON.stringify({
              deviceId: d.deviceId,
              deviceToken: d.token ?? TOKEN,
            }),
          })),
        });
      }
      if (name === 'DeleteProfileObjectCommand') {
        if (opts.deleteThrows) {
          return Promise.reject(new Error('delete failed'));
        }
        deletes.push(
          command.input as unknown as DeleteProfileObjectCommandInput,
        );
        return Promise.resolve({});
      }
      return Promise.reject(new Error(`unexpected command ${name}`));
    },
  } as unknown as CustomerProfilesClient;
  return { client, deletes, searches, listedProfiles };
};

void describe('evictDeviceFromOtherProfiles', () => {
  void it('searches by the deviceSearchKey for the exact deviceId', async () => {
    const { client, searches } = fake({ searchItems: [] });

    await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(searches.length, 1);
    assert.strictEqual(searches[0].DomainName, 'domain');
    assert.strictEqual(searches[0].KeyName, DEVICE_SEARCH_KEY);
    // Keyed on the SINGLE deviceId, so only profiles holding that exact device
    // are returned.
    assert.deepStrictEqual(searches[0].Values, ['dev-1']);
  });

  void it('evicts the token-matched device from OTHER profiles and skips the keep profile', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [
        { ProfileId: 'keep' },
        { ProfileId: 'p2' },
        { ProfileId: 'p3' },
      ],
      devicesByProfile: {
        keep: [{ uniqueKey: 'k-keep', deviceId: 'dev-1', token: TOKEN }],
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1', token: TOKEN }],
        p3: [{ uniqueKey: 'k3', deviceId: 'dev-1', token: TOKEN }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 2);
    assert.ok(!listedProfiles.includes('keep'), 'keep profile never listed');
    assert.deepStrictEqual(
      deletes.map((d) => d.ProfileObjectUniqueKey).sort(),
      ['k2', 'k3'],
    );
    assert.ok(deletes.every((d) => d.ProfileId !== 'keep'));
    assert.ok(deletes.every((d) => d.ObjectTypeName === 'AmplifyDevice'));
  });

  void it('does NOT evict when the stored token differs from the incoming token (mismatch)', async () => {
    const { client, deletes } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: {
        // Same deviceId, but a DIFFERENT stored token -> not this physical device.
        p2: [
          { uniqueKey: 'k2', deviceId: 'dev-1', token: 'a-different-token' },
        ],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('evicts ONLY the re-homing deviceId, leaving other devices on the profile untouched (multi-device isolation)', async () => {
    const { client, deletes } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: {
        // p2 holds two devices; only dev-1 (with the matching token) re-homes.
        p2: [
          { uniqueKey: 'k-d1', deviceId: 'dev-1', token: TOKEN },
          { uniqueKey: 'k-d2', deviceId: 'dev-2', token: TOKEN },
        ],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    // Exactly one delete: dev-1's object. dev-2 (the user's other device) is
    // never touched.
    assert.strictEqual(outcome.evicted, 1);
    assert.deepStrictEqual(
      deletes.map((d) => d.ProfileObjectUniqueKey),
      ['k-d1'],
    );
    assert.ok(
      !deletes.some((d) => d.ProfileObjectUniqueKey === 'k-d2'),
      'must NOT evict a different deviceId on the same profile',
    );
  });

  void it('paginates SearchProfiles (NextToken) and evicts profiles found on later pages', async () => {
    const { client, deletes, searches } = fake({
      searchPages: [
        [{ ProfileId: 'p1' }], // page 1 (returns a NextToken)
        [{ ProfileId: 'p2' }], // page 2
      ],
      devicesByProfile: {
        p1: [{ uniqueKey: 'k1', deviceId: 'dev-1', token: TOKEN }],
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1', token: TOKEN }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(searches.length, 2, 'both pages fetched');
    assert.strictEqual(outcome.evicted, 2);
    assert.ok(
      deletes.some((d) => d.ProfileId === 'p2'),
      'a profile found only on page 2 is evicted',
    );
  });

  void it('de-duplicates repeated profileIds from the eventually-consistent search', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [{ ProfileId: 'p2' }, { ProfileId: 'p2' }],
      devicesByProfile: {
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1', token: TOKEN }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 1);
    assert.strictEqual(listedProfiles.filter((p) => p === 'p2').length, 1);
    assert.strictEqual(deletes.length, 1);
  });

  void it('ignores search items without a ProfileId', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [{}, { ProfileId: undefined }],
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(listedProfiles.length, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('no-ops when the only match is the keep profile', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [{ ProfileId: 'keep' }],
      devicesByProfile: {
        keep: [{ uniqueKey: 'k', deviceId: 'dev-1', token: TOKEN }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(listedProfiles.length, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('skips eviction entirely when there is no incoming token', async () => {
    const { client, deletes, searches } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: {
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1', token: TOKEN }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      undefined,
    );

    // No token to prove device ownership -> no search, no delete.
    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(searches.length, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('best-effort: swallows a delete failure and counts only successes', async () => {
    const { client } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: {
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1', token: TOKEN }],
      },
      deleteThrows: true,
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 0);
  });

  void it('best-effort: swallows a SearchProfiles failure and never throws', async () => {
    const { client, deletes } = fake({ searchThrows: true });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      TOKEN,
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('visits ALL candidate profiles (no early exit): evicts the token-matched LIVE object while leaving a DEAD-token object in place', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [
        { ProfileId: 'A' },
        { ProfileId: 'B' },
        { ProfileId: 'keep' },
      ],
      devicesByProfile: {
        // A holds dev-1 with a DEAD (mismatched) token -> must be left in place.
        A: [{ uniqueKey: 'k-A-dead', deviceId: 'dev-1', token: 'T_dead' }],
        // B holds dev-1 with the LIVE token -> must be evicted.
        B: [{ uniqueKey: 'k-B-live', deviceId: 'dev-1', token: 'T_live' }],
        keep: [{ uniqueKey: 'k-keep', deviceId: 'dev-1', token: 'T_live' }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
      'T_live',
    );

    // Only B's live object is evicted; A's dead-token object is left in place.
    assert.strictEqual(outcome.evicted, 1);
    assert.deepStrictEqual(
      deletes.map((d) => d.ProfileObjectUniqueKey),
      ['k-B-live'],
    );
    assert.ok(
      !deletes.some((d) => d.ProfileObjectUniqueKey === 'k-A-dead'),
      'dead-token object must be left in place (token mismatch)',
    );
    // Proof of NO early exit: BOTH A and B were listed, even though A (visited
    // first) produced no eviction.
    assert.ok(
      listedProfiles.includes('A') && listedProfiles.includes('B'),
      'must visit every candidate profile, not stop after the first',
    );
  });
});
