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

type FakeDevice = { uniqueKey: string; deviceId?: string; token?: string };

/**
 * Fake CustomerProfilesClient that dispatches on command class name and drives
 * the REAL evictDeviceFromOtherProfiles -> listDevices/deleteDevice code path
 * (no network, no SDK mocking framework).
 *
 * - SearchProfiles returns the injected `searchItems` (or throws).
 * - ListProfileObjects returns the injected devices for the queried ProfileId.
 * - DeleteProfileObject records the input (or throws when `deleteThrows`).
 */
const fake = (opts: {
  searchItems?: Profile[];
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
              deviceToken: d.token ?? 'tok',
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
  void it('searches by the deviceSearchKey for the deviceId', async () => {
    const { client, searches } = fake({ searchItems: [] });

    await evictDeviceFromOtherProfiles(client, 'domain', 'dev-1', 'keep');

    assert.strictEqual(searches.length, 1);
    assert.strictEqual(searches[0].DomainName, 'domain');
    assert.strictEqual(searches[0].KeyName, DEVICE_SEARCH_KEY);
    assert.deepStrictEqual(searches[0].Values, ['dev-1']);
  });

  void it('deletes the device on every OTHER profile and skips the keep profile', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [
        { ProfileId: 'keep' },
        { ProfileId: 'p2' },
        { ProfileId: 'p3' },
      ],
      devicesByProfile: {
        keep: [{ uniqueKey: 'k-keep', deviceId: 'dev-1' }],
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1' }],
        p3: [{ uniqueKey: 'k3', deviceId: 'dev-1' }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
    );

    assert.strictEqual(outcome.evicted, 2);
    // Keep profile is never listed nor deleted.
    assert.ok(!listedProfiles.includes('keep'));
    assert.deepStrictEqual(
      deletes.map((d) => d.ProfileObjectUniqueKey).sort(),
      ['k2', 'k3'],
    );
    assert.ok(deletes.every((d) => d.ProfileId !== 'keep'));
    assert.ok(deletes.every((d) => d.ObjectTypeName === 'AmplifyDevice'));
  });

  void it('only deletes device objects whose deviceId matches', async () => {
    const { client, deletes } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: {
        p2: [
          { uniqueKey: 'match', deviceId: 'dev-1' },
          { uniqueKey: 'skip-key', deviceId: 'dev-other' },
        ],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
    );

    assert.strictEqual(outcome.evicted, 1);
    assert.deepStrictEqual(
      deletes.map((d) => d.ProfileObjectUniqueKey),
      ['match'],
    );
  });

  void it('de-duplicates repeated profileIds from the eventually-consistent search', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [{ ProfileId: 'p2' }, { ProfileId: 'p2' }],
      devicesByProfile: {
        p2: [{ uniqueKey: 'k2', deviceId: 'dev-1' }],
      },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
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
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(listedProfiles.length, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('no-ops when the only match is the keep profile', async () => {
    const { client, deletes, listedProfiles } = fake({
      searchItems: [{ ProfileId: 'keep' }],
      devicesByProfile: { keep: [{ uniqueKey: 'k', deviceId: 'dev-1' }] },
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(listedProfiles.length, 0);
    assert.strictEqual(deletes.length, 0);
  });

  void it('best-effort: swallows a delete failure and counts only successes', async () => {
    const { client } = fake({
      searchItems: [{ ProfileId: 'p2' }],
      devicesByProfile: { p2: [{ uniqueKey: 'k2', deviceId: 'dev-1' }] },
      deleteThrows: true,
    });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
    );

    // deleteDevice swallows the error and returns false -> not counted.
    assert.strictEqual(outcome.evicted, 0);
  });

  void it('best-effort: swallows a SearchProfiles failure and never throws', async () => {
    const { client, deletes } = fake({ searchThrows: true });

    const outcome = await evictDeviceFromOtherProfiles(
      client,
      'domain',
      'dev-1',
      'keep',
    );

    assert.strictEqual(outcome.evicted, 0);
    assert.strictEqual(deletes.length, 0);
  });
});
