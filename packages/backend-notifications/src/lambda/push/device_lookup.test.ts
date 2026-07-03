// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type {
  CustomerProfilesClient,
  DeleteProfileObjectCommandInput,
  ListProfileObjectsCommandOutput,
} from '@aws-sdk/client-customer-profiles';
import { deleteDevice, listDevices } from './device_lookup.js';

type ListPage = Partial<ListProfileObjectsCommandOutput>;

/**
 * Fake CustomerProfilesClient that serves canned ListProfileObjects pages and
 * records DeleteProfileObject calls (optionally throwing on delete).
 */
const fakeProfiles = (opts: {
  pages?: ListPage[];
  deleteThrows?: boolean;
}): {
  client: CustomerProfilesClient;
  deletes: DeleteProfileObjectCommandInput[];
} => {
  const pages = opts.pages ?? [];
  const deletes: DeleteProfileObjectCommandInput[] = [];
  let call = 0;
  const client = {
    send: (command: {
      constructor: { name: string };
      input: unknown;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      if (name === 'ListProfileObjectsCommand') {
        const page = pages[call] ?? {};
        call += 1;
        return Promise.resolve(page);
      }
      if (name === 'DeleteProfileObjectCommand') {
        if (opts.deleteThrows) {
          return Promise.reject(new Error('delete failed'));
        }
        deletes.push(command.input as DeleteProfileObjectCommandInput);
        return Promise.resolve({});
      }
      return Promise.reject(new Error(`unexpected command ${name}`));
    },
  } as unknown as CustomerProfilesClient;
  return { client, deletes };
};

const deviceObject = (o: Record<string, unknown>): string => JSON.stringify(o);

void describe('listDevices', () => {
  void it('extracts token + channel + uniqueKey across pages', async () => {
    const { client } = fakeProfiles({
      pages: [
        {
          Items: [
            {
              ProfileObjectUniqueKey: 'k1',
              Object: deviceObject({
                deviceId: 'd1',
                deviceToken: 'tok-1',
                channelType: 'APNS',
              }),
            },
          ],
          NextToken: 'next',
        },
        {
          Items: [
            {
              ProfileObjectUniqueKey: 'k2',
              Object: deviceObject({
                deviceId: 'd2',
                deviceToken: 'tok-2',
                channelType: 'FCM',
              }),
            },
          ],
        },
      ],
    });
    const devices = await listDevices(client, 'Domain', 'p1');
    assert.strictEqual(devices.length, 2);
    assert.deepStrictEqual(
      devices.map((d) => [d.deviceToken, d.channelType, d.objectUniqueKey]),
      [
        ['tok-1', 'APNS', 'k1'],
        ['tok-2', 'FCM', 'k2'],
      ],
    );
  });

  void it('skips objects with no token, no unique key, or malformed JSON', async () => {
    const { client } = fakeProfiles({
      pages: [
        {
          Items: [
            {
              ProfileObjectUniqueKey: 'k1',
              Object: deviceObject({ deviceId: 'd' }),
            }, // no token
            { ProfileObjectUniqueKey: 'k2', Object: '{not json' }, // malformed
            { Object: deviceObject({ deviceToken: 'x' }) }, // no unique key
            {
              ProfileObjectUniqueKey: 'k4',
              Object: deviceObject({ deviceToken: 'good', channelType: 'GCM' }),
            },
          ],
        },
      ],
    });
    const devices = await listDevices(client, 'Domain', 'p1');
    assert.deepStrictEqual(
      devices.map((d) => d.deviceToken),
      ['good'],
    );
  });

  void it('returns an empty list when the profile has no device objects', async () => {
    const { client } = fakeProfiles({ pages: [{ Items: [] }] });
    assert.deepStrictEqual(await listDevices(client, 'Domain', 'p1'), []);
  });
});

void describe('deleteDevice', () => {
  void it('deletes the object by its unique key and returns true', async () => {
    const { client, deletes } = fakeProfiles({});
    const ok = await deleteDevice(client, 'Domain', 'p1', 'k9');
    assert.strictEqual(ok, true);
    assert.strictEqual(deletes.length, 1);
    assert.strictEqual(deletes[0].ProfileObjectUniqueKey, 'k9');
  });

  void it('swallows a failed delete and returns false (best-effort)', async () => {
    const { client } = fakeProfiles({ deleteThrows: true });
    const ok = await deleteDevice(client, 'Domain', 'p1', 'k9');
    assert.strictEqual(ok, false);
  });
});
