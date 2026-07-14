// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  ListProfileObjectsCommand,
  MergeProfilesCommand,
  PutProfileObjectCommand,
  SearchProfilesCommand,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';

import { ENV_DOMAIN_NAME } from '../../constants.js';
import { handler } from './handler.js';
import { IdentifyEvent } from './principal.js';

const DOMAIN = 'amplify-notifications-domain';
const AUTHED_PROFILE_ID = 'authed-profile-1';
const GUEST_PROFILE_ID = 'guest-profile-1';

/**
 * A minimal fake CustomerProfiles `send` that routes by command class name.
 * `SearchProfilesCommand` resolves a ProfileId per the searched KeyName so the
 * authed vs guest lookups can return distinct profiles (enabling the merge path).
 */
const mockProfiles = (
  overrides: {
    searchByKey?: Record<string, string | undefined>;
    listItems?: unknown[];
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
          const found = searchByKey[keyName];
          return Promise.resolve({
            Items: found ? [{ ProfileId: found }] : [],
          });
        }
        case ListProfileObjectsCommand.name:
          return Promise.resolve({ Items: overrides.listItems ?? [] });
        case PutProfileObjectCommand.name:
        case UpdateProfileCommand.name:
        case MergeProfilesCommand.name:
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
    // No device data -> no ListProfileObjects device read.
    assert.ok(!seen.includes(ListProfileObjectsCommand.name));
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

  void it('guest path: resolves via the guest key and never merges', async () => {
    const seen: string[] = [];
    mockProfiles({
      searchByKey: { cognitoIdentityKey: GUEST_PROFILE_ID },
      onCommand: (name) => seen.push(name),
    });

    const res = await handler(
      guestEvent({
        userProfile: { name: 'Guest' },
        options: { guestIdentityId: 'us-east-1:other' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    // Guests never trigger a merge even when guestIdentityId is present.
    assert.ok(!seen.includes(MergeProfilesCommand.name));
  });

  void it('merge-on-sign-in: authed caller with a prior guest folds it in', async () => {
    let merged = false;
    mockProfiles({
      searchByKey: {
        cognitoUserKey: AUTHED_PROFILE_ID,
        cognitoIdentityKey: GUEST_PROFILE_ID,
      },
      onCommand: (name) => {
        if (name === MergeProfilesCommand.name) {
          merged = true;
        }
      },
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: { guestIdentityId: 'us-east-1:guest' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.ok(merged, 'guest profile merged into authed profile');
  });

  void it('merge failure is swallowed and does not fail the identify result', async () => {
    mockProfiles({
      searchByKey: {
        cognitoUserKey: AUTHED_PROFILE_ID,
        cognitoIdentityKey: GUEST_PROFILE_ID,
      },
      throwOn: MergeProfilesCommand.name,
    });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: { guestIdentityId: 'us-east-1:guest' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
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
