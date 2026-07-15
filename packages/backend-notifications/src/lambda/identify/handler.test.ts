// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  DeleteProfileObjectCommand,
  ListProfileObjectsCommand,
  MergeProfilesCommand,
  type Profile,
  PutProfileObjectCommand,
  SearchProfilesCommand,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';

import { DEVICE_SEARCH_KEY, ENV_DOMAIN_NAME } from '../../constants.js';
import { handler } from './handler.js';
import { IdentifyEvent } from './principal.js';

const DOMAIN = 'amplify-notifications-domain';
const AUTHED_PROFILE_ID = 'authed-profile-1';
const GUEST_PROFILE_ID = 'guest-profile-1';
const OTHER_PROFILE_ID = 'other-profile-2';

/**
 * A minimal fake CustomerProfiles `send` that routes by command class name.
 *
 * - `SearchProfilesCommand` resolves a ProfileId per the searched KeyName
 *   (`searchByKey`) so authed vs guest identity lookups return distinct
 *   profiles; `searchItemsByKey` lets a key (e.g. the `deviceSearchKey`
 *   eviction lookup) return MULTIPLE profiles.
 * - `ListProfileObjectsCommand` returns `listItemsByProfile[ProfileId]` when
 *   present (per-profile device objects for eviction), else `listItems`.
 * - `DeleteProfileObjectCommand` resolves; assert via `onCommand`.
 */
const mockProfiles = (
  overrides: {
    searchByKey?: Record<string, string | undefined>;
    searchItemsByKey?: Record<string, Profile[]>;
    listItems?: unknown[];
    listItemsByProfile?: Record<string, unknown[]>;
    onCommand?: (name: string, input: Record<string, unknown>) => void;
    throwOn?: string;
  } = {},
): void => {
  const searchByKey = overrides.searchByKey ?? {
    cognitoUserKey: AUTHED_PROFILE_ID,
  };
  mock.method(
    CustomerProfilesClient.prototype,
    'send',
    (command: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }): Promise<unknown> => {
      const name = command.constructor.name;
      overrides.onCommand?.(name, command.input);
      if (overrides.throwOn === name) {
        const err = Object.assign(new Error('boom'), {
          name: 'ServiceError',
          $metadata: { httpStatusCode: 502 },
        });
        return Promise.reject(err);
      }
      switch (name) {
        case SearchProfilesCommand.name: {
          const keyName = command.input.KeyName as string;
          if (
            overrides.searchItemsByKey &&
            keyName in overrides.searchItemsByKey
          ) {
            return Promise.resolve({
              Items: overrides.searchItemsByKey[keyName],
            });
          }
          const found = searchByKey[keyName];
          return Promise.resolve({
            Items: found ? [{ ProfileId: found }] : [],
          });
        }
        case ListProfileObjectsCommand.name: {
          const profileId = command.input.ProfileId as string;
          if (
            overrides.listItemsByProfile &&
            profileId in overrides.listItemsByProfile
          ) {
            return Promise.resolve({
              Items: overrides.listItemsByProfile[profileId],
            });
          }
          return Promise.resolve({ Items: overrides.listItems ?? [] });
        }
        case DeleteProfileObjectCommand.name:
        case PutProfileObjectCommand.name:
        case UpdateProfileCommand.name:
          return Promise.resolve({});
        default:
          return Promise.reject(new Error(`unexpected command ${name}`));
      }
    },
  );
};

const authedEvent = (body: unknown, sub = 'sub-123'): IdentifyEvent => ({
  body: body === undefined ? undefined : JSON.stringify(body),
  requestContext: { authorizer: { jwt: { claims: { sub } } } },
});

const guestEvent = (
  body: unknown,
  identityId = 'us-east-1:guest',
): IdentifyEvent => ({
  body: JSON.stringify(body),
  requestContext: {
    identity: {
      cognitoIdentityId: identityId,
      cognitoAuthenticationType: 'unauthenticated',
    },
  },
});

beforeEach(() => {
  process.env[ENV_DOMAIN_NAME] = DOMAIN;
});

afterEach(() => {
  mock.restoreAll();
  delete process.env[ENV_DOMAIN_NAME];
});

void describe('identify handler', () => {
  void it('returns 500 when the domain env var is missing', async () => {
    delete process.env[ENV_DOMAIN_NAME];
    const res = await handler(authedEvent({ userProfile: {} }));
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body ?? '', /Server misconfiguration/);
  });

  void it('returns 401 when no verified caller identity is present', async () => {
    const res = await handler({ body: JSON.stringify({ userProfile: {} }) });
    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body ?? '', /Unauthorized/);
  });

  void it('returns 400 on invalid JSON body', async () => {
    const res = await handler({
      body: '{not json',
      requestContext: { authorizer: { jwt: { claims: { sub: 'sub-1' } } } },
    });
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body ?? '', /Invalid JSON/);
  });

  void it('returns 400 when the body fails validation', async () => {
    const res = await handler(authedEvent({ userId: 42, userProfile: {} }));
    assert.strictEqual(res.statusCode, 400);
  });

  void it('happy path (authed, no device): creates profile and updates attributes', async () => {
    const seen: string[] = [];
    mockProfiles({ onCommand: (name) => seen.push(name) });

    const res = await handler(
      authedEvent({ userProfile: { name: 'Ada', email: 'ada@example.com' } }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(res.body ?? '{}'), { status: 'ok' });
    assert.ok(seen.includes(PutProfileObjectCommand.name));
    assert.ok(seen.includes(SearchProfilesCommand.name));
    assert.ok(seen.includes(UpdateProfileCommand.name));
    // No device data -> no ListProfileObjects device read and no eviction.
    assert.ok(!seen.includes(ListProfileObjectsCommand.name));
    assert.ok(!seen.includes(DeleteProfileObjectCommand.name));
  });

  void it('registers a device (ListProfileObjects + device PutProfileObject) when deviceId is present', async () => {
    const puts: Record<string, unknown>[] = [];
    let listCalled = false;
    mockProfiles({
      listItems: [
        {
          Object: JSON.stringify({
            deviceId: 'dev-1',
            createdAt: '2020-01-01T00:00:00.000Z',
          }),
        },
      ],
      onCommand: (name, input) => {
        if (name === ListProfileObjectsCommand.name) {
          listCalled = true;
        }
        if (name === PutProfileObjectCommand.name) {
          puts.push(input);
        }
      },
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: {
          deviceId: 'dev-1',
          address: 'token-abc',
          channelType: 'APNS',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.ok(listCalled, 'device createdAt read-back happened');
    // Two PutProfileObject calls: profile find-or-create + device upsert.
    assert.strictEqual(puts.length, 2);
    const devicePut = puts.find(
      (p) => (p.ObjectTypeName as string) === 'AmplifyDevice',
    );
    assert.ok(devicePut, 'device object was written');
  });

  void it('authed identify evicts the token-matched device from another profile (keep untouched)', async () => {
    const deletes: Record<string, unknown>[] = [];
    mockProfiles({
      searchByKey: { cognitoUserKey: AUTHED_PROFILE_ID },
      // The deviceSearchKey lookup finds the device on BOTH the auth (keep)
      // profile and a second profile whose stored token matches (the same
      // physical device re-homing).
      searchItemsByKey: {
        [DEVICE_SEARCH_KEY]: [
          { ProfileId: AUTHED_PROFILE_ID },
          { ProfileId: OTHER_PROFILE_ID },
        ],
      },
      listItemsByProfile: {
        // Auth profile: the createdAt read-back for the just-registered device.
        [AUTHED_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'keep-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'token-abc',
              createdAt: '2020-01-01T00:00:00.000Z',
            }),
          },
        ],
        // Other profile: carries the SAME device with the SAME live token.
        [OTHER_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'other-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'token-abc',
            }),
          },
        ],
      },
      onCommand: (name, input) => {
        if (name === DeleteProfileObjectCommand.name) {
          deletes.push(input);
        }
      },
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: {
          deviceId: 'dev-1',
          address: 'token-abc',
          channelType: 'APNS',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    // Exactly one eviction: the OTHER profile's device object, by unique key.
    assert.strictEqual(deletes.length, 1);
    assert.strictEqual(deletes[0].ProfileId, OTHER_PROFILE_ID);
    assert.strictEqual(deletes[0].ProfileObjectUniqueKey, 'other-key');
    assert.strictEqual(deletes[0].ObjectTypeName, 'AmplifyDevice');
    // The profile the device was just registered on is NEVER evicted.
    assert.ok(
      !deletes.some((d) => d.ProfileId === AUTHED_PROFILE_ID),
      'must not evict the keep profile',
    );
  });

  void it('device eviction failure does not fail the identify result', async () => {
    // The cross-profile delete throws, but registration already succeeded.
    mockProfiles({
      searchByKey: { cognitoUserKey: AUTHED_PROFILE_ID },
      searchItemsByKey: {
        [DEVICE_SEARCH_KEY]: [{ ProfileId: OTHER_PROFILE_ID }],
      },
      listItemsByProfile: {
        [OTHER_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'other-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'token-abc',
            }),
          },
        ],
      },
      throwOn: DeleteProfileObjectCommand.name,
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: {
          deviceId: 'dev-1',
          address: 'token-abc',
          channelType: 'APNS',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
  });

  void it('ignores a guestIdentityId in the body and never triggers a profile merge', async () => {
    const seen: string[] = [];
    mockProfiles({ onCommand: (name) => seen.push(name) });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        // A client-supplied guestIdentityId is now ignored entirely: the merge
        // attack vector is removed. It must NEVER trigger MergeProfiles.
        options: { guestIdentityId: 'us-east-1:attacker-guest' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.ok(!seen.includes(MergeProfilesCommand.name));
  });

  void it('guest identify ALSO evicts the token-matched device from another profile', async () => {
    const deletes: Record<string, unknown>[] = [];
    mockProfiles({
      searchByKey: { cognitoIdentityKey: GUEST_PROFILE_ID },
      searchItemsByKey: {
        [DEVICE_SEARCH_KEY]: [
          { ProfileId: GUEST_PROFILE_ID },
          { ProfileId: OTHER_PROFILE_ID },
        ],
      },
      listItemsByProfile: {
        [GUEST_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'keep-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'token-abc',
              createdAt: '2020-01-01T00:00:00.000Z',
            }),
          },
        ],
        // Another profile holds the same device with the same live token.
        [OTHER_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'other-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'token-abc',
            }),
          },
        ],
      },
      onCommand: (name, input) => {
        if (name === DeleteProfileObjectCommand.name) deletes.push(input);
      },
    });

    const res = await handler(
      guestEvent({
        userProfile: { name: 'Guest' },
        options: {
          deviceId: 'dev-1',
          address: 'token-abc',
          channelType: 'GCM',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    // The guest path evicts too (uniform, token-matched): the OTHER profile's
    // matching device object is deleted, the keep (guest) profile is not.
    assert.strictEqual(deletes.length, 1);
    assert.strictEqual(deletes[0].ProfileId, OTHER_PROFILE_ID);
    assert.strictEqual(deletes[0].ProfileObjectUniqueKey, 'other-key');
  });

  void it('does NOT evict a device whose stored token differs from the incoming token', async () => {
    const deletes: Record<string, unknown>[] = [];
    mockProfiles({
      searchByKey: { cognitoUserKey: AUTHED_PROFILE_ID },
      searchItemsByKey: {
        [DEVICE_SEARCH_KEY]: [
          { ProfileId: AUTHED_PROFILE_ID },
          { ProfileId: OTHER_PROFILE_ID },
        ],
      },
      listItemsByProfile: {
        [AUTHED_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'keep-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'incoming-token',
              createdAt: '2020-01-01T00:00:00.000Z',
            }),
          },
        ],
        // Same deviceId on another profile, but a DIFFERENT stored token: the
        // caller has not proven it holds this physical device, so no eviction.
        [OTHER_PROFILE_ID]: [
          {
            ProfileObjectUniqueKey: 'other-key',
            Object: JSON.stringify({
              deviceId: 'dev-1',
              deviceToken: 'a-different-token',
            }),
          },
        ],
      },
      onCommand: (name, input) => {
        if (name === DeleteProfileObjectCommand.name) deletes.push(input);
      },
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: {
          deviceId: 'dev-1',
          address: 'incoming-token',
          channelType: 'APNS',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    // Token mismatch on the other profile -> its device object is NOT evicted.
    assert.strictEqual(deletes.length, 0);
  });

  void it('returns 500 when a Customer Profiles call fails', async () => {
    mockProfiles({ throwOn: UpdateProfileCommand.name });
    const res = await handler(authedEvent({ userProfile: { name: 'Ada' } }));
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body ?? '', /Customer Profiles error/);
  });

  void it('returns 500 when the profile cannot be resolved after create', async () => {
    // SearchProfiles never returns a ProfileId -> resolveOrCreateProfile throws.
    mockProfiles({ searchByKey: {} });
    const res = await handler(authedEvent({ userProfile: { name: 'Ada' } }));
    assert.strictEqual(res.statusCode, 500);
  });
});
