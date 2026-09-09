/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { resolveOrCreateProfile } from './profile_resolver.js';
import {
  OBJECT_TYPE_PROFILE,
  PRINCIPAL_ID_FIELD,
  PRINCIPAL_ID_KEY,
} from '../../constants.js';

type CommandLike = { constructor: { name: string }; input: any };

const PRINCIPAL = 'us-east-1:principal-1';

void describe('resolveOrCreateProfile', () => {
  void it('PutProfileObject find-or-create on AmplifyProfile then SearchProfiles by principalIdKey', async () => {
    const seen: CommandLike[] = [];
    const profiles = {
      send: (command: CommandLike): Promise<unknown> => {
        seen.push(command);
        if (command.constructor.name === 'PutProfileObjectCommand') {
          return Promise.resolve({});
        }
        return Promise.resolve({ Items: [{ ProfileId: 'profile-123' }] });
      },
    } as unknown as CustomerProfilesClient;

    const { profileId } = await resolveOrCreateProfile(
      profiles,
      'Domain',
      PRINCIPAL,
    );
    assert.strictEqual(profileId, 'profile-123');

    const put = seen.find(
      (c) => c.constructor.name === 'PutProfileObjectCommand',
    )!;
    assert.strictEqual(put.input.ObjectTypeName, OBJECT_TYPE_PROFILE);
    assert.deepStrictEqual(JSON.parse(put.input.Object), {
      [PRINCIPAL_ID_FIELD]: PRINCIPAL,
    });

    const search = seen.find(
      (c) => c.constructor.name === 'SearchProfilesCommand',
    )!;
    assert.strictEqual(search.input.KeyName, PRINCIPAL_ID_KEY);
    assert.deepStrictEqual(search.input.Values, [PRINCIPAL]);
  });

  void it('retries SearchProfiles until the profile is visible (eventual consistency)', async () => {
    let searchCalls = 0;
    const profiles = {
      send: (command: CommandLike): Promise<unknown> => {
        if (command.constructor.name === 'PutProfileObjectCommand') {
          return Promise.resolve({});
        }
        searchCalls += 1;
        // First two reads see nothing, third resolves the id.
        return Promise.resolve(
          searchCalls < 3 ? { Items: [] } : { Items: [{ ProfileId: 'p9' }] },
        );
      },
    } as unknown as CustomerProfilesClient;

    const { profileId } = await resolveOrCreateProfile(
      profiles,
      'Domain',
      PRINCIPAL,
    );
    assert.strictEqual(profileId, 'p9');
    assert.strictEqual(searchCalls, 3);
  });

  void it('throws when no ProfileId resolves after the bounded poll', async () => {
    const profiles = {
      send: (command: CommandLike): Promise<unknown> => {
        if (command.constructor.name === 'PutProfileObjectCommand') {
          return Promise.resolve({});
        }
        return Promise.resolve({ Items: [] });
      },
    } as unknown as CustomerProfilesClient;

    await assert.rejects(
      resolveOrCreateProfile(profiles, 'Domain', PRINCIPAL),
      /did not resolve a ProfileId/,
    );
  });
});
