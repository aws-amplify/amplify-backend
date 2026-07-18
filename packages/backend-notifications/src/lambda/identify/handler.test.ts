// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import {
  CustomerProfilesClient,
  PutProfileObjectCommand,
  SearchProfilesCommand,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';

import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';
import { handler } from './handler.js';
import { IdentifyEvent } from './principal.js';

const DOMAIN = 'amplify-notifications-domain';
const DEVICES_TABLE = 'Devices-table';
const AUTHED_PROFILE_ID = 'authed-profile-1';
const GUEST_PROFILE_ID = 'guest-profile-1';

/**
 * A minimal fake CustomerProfiles `send` that routes by command class name.
 * `SearchProfilesCommand` resolves a ProfileId per the searched KeyName
 * (`searchByKey`) so authed vs guest identity lookups return distinct profiles.
 * `PutProfileObjectCommand` / `UpdateProfileCommand` resolve; assert via
 * `onCommand`. Device storage is NO LONGER in Customer Profiles.
 */
const mockProfiles = (
  overrides: {
    searchByKey?: Record<string, string | undefined>;
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
        case PutProfileObjectCommand.name:
        case UpdateProfileCommand.name:
          return Promise.resolve({});
        default:
          return Promise.reject(new Error(`unexpected command ${name}`));
      }
    },
  );
};

/**
 * Fake DynamoDB `send` for the Devices table. Records each UpdateItem input via
 * `onUpdate`; rejects when `throw` is set (to prove the CRITICAL COMMIT gates
 * registration success).
 */
const mockDdb = (
  overrides: {
    onUpdate?: (input: Record<string, unknown>) => void;
    throw?: boolean;
  } = {},
): void => {
  mock.method(
    DynamoDBClient.prototype,
    'send',
    (command: {
      constructor: { name: string };
      input: Record<string, unknown>;
    }): Promise<unknown> => {
      if (command.constructor.name === UpdateItemCommand.name) {
        overrides.onUpdate?.(command.input);
        if (overrides.throw) {
          const err = Object.assign(new Error('ddb down'), {
            name: 'InternalServerError',
            $metadata: { httpStatusCode: 500 },
          });
          return Promise.reject(err);
        }
        return Promise.resolve({});
      }
      return Promise.reject(
        new Error(`unexpected ddb command ${command.constructor.name}`),
      );
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
  process.env[ENV_DEVICES_TABLE_NAME] = DEVICES_TABLE;
});

afterEach(() => {
  mock.restoreAll();
  delete process.env[ENV_DOMAIN_NAME];
  delete process.env[ENV_DEVICES_TABLE_NAME];
});

void describe('identify handler', () => {
  void it('returns 500 when the domain env var is missing', async () => {
    delete process.env[ENV_DOMAIN_NAME];
    const res = await handler(authedEvent({ userProfile: {} }));
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body ?? '', /Server misconfiguration/);
  });

  void it('returns 500 when the devices table env var is missing', async () => {
    delete process.env[ENV_DEVICES_TABLE_NAME];
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

  void it('happy path (authed, no device): creates profile and updates attributes, no DDB write', async () => {
    const seen: string[] = [];
    let ddbCalled = false;
    mockProfiles({ onCommand: (name) => seen.push(name) });
    mockDdb({ onUpdate: () => (ddbCalled = true) });

    const res = await handler(
      authedEvent({ userProfile: { name: 'Ada', email: 'ada@example.com' } }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(res.body ?? '{}'), { status: 'ok' });
    assert.ok(seen.includes(PutProfileObjectCommand.name));
    assert.ok(seen.includes(SearchProfilesCommand.name));
    assert.ok(seen.includes(UpdateProfileCommand.name));
    // No device data -> no DDB owner write.
    assert.strictEqual(ddbCalled, false);
  });

  void it('registers a device via a DDB last-writer-wins UpdateItem on the deviceId PK (this IS the eviction)', async () => {
    const updates: Record<string, any>[] = [];
    mockProfiles({});
    mockDdb({ onUpdate: (input) => updates.push(input) });

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada', demographic: { platform: 'iOS' } },
        options: {
          deviceId: 'dev-1',
          address: 'token-abc',
          channelType: 'APNS',
        },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(updates.length, 1);
    const u = updates[0];
    assert.strictEqual(u.TableName, DEVICES_TABLE);
    assert.deepStrictEqual(u.Key, { deviceId: { S: 'dev-1' } });
    assert.strictEqual(
      u.ExpressionAttributeValues[':profileId'].S,
      AUTHED_PROFILE_ID,
    );
    assert.strictEqual(u.ExpressionAttributeValues[':token'].S, 'token-abc');
    assert.strictEqual(u.ExpressionAttributeValues[':channelType'].S, 'APNS');
    assert.strictEqual(u.ExpressionAttributeValues[':platform'].S, 'iOS');
    assert.match(
      u.UpdateExpression,
      /createdAt = if_not_exists\(createdAt, :now\)/,
    );
  });

  void it('does NOT write a device when deviceId is present but no push token (address) is supplied', async () => {
    let ddbCalled = false;
    mockProfiles({});
    mockDdb({ onUpdate: () => (ddbCalled = true) });

    const res = await handler(
      authedEvent({
        userProfile: {},
        options: { deviceId: 'dev-1', channelType: 'APNS' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(ddbCalled, false);
  });

  void it('CRITICAL COMMIT: a failed DDB owner write fails the whole registration (500)', async () => {
    let updateProfileCalled = false;
    mockProfiles({
      onCommand: (name) => {
        if (name === UpdateProfileCommand.name) updateProfileCalled = true;
      },
    });
    mockDdb({ throw: true });

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

    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body ?? '', /Internal error/);
    // The DDB write is the critical commit and runs BEFORE the profile
    // attribute update, so a failure short-circuits before UpdateProfile.
    assert.strictEqual(updateProfileCalled, false);
  });

  void it('guest identify writes the device owner as the GUEST profile', async () => {
    const updates: Record<string, any>[] = [];
    mockProfiles({ searchByKey: { cognitoIdentityKey: GUEST_PROFILE_ID } });
    mockDdb({ onUpdate: (input) => updates.push(input) });

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
    assert.strictEqual(updates.length, 1);
    assert.strictEqual(
      updates[0].ExpressionAttributeValues[':profileId'].S,
      GUEST_PROFILE_ID,
    );
  });

  void it('ignores a guestIdentityId in the body and never triggers a profile merge', async () => {
    const seen: string[] = [];
    mockProfiles({ onCommand: (name) => seen.push(name) });
    mockDdb({});

    const res = await handler(
      authedEvent({
        userProfile: { name: 'Ada' },
        options: { guestIdentityId: 'us-east-1:attacker-guest' },
      }),
    );

    assert.strictEqual(res.statusCode, 200);
    assert.ok(!seen.includes('MergeProfilesCommand'));
  });

  void it('returns 500 when a Customer Profiles call fails', async () => {
    mockProfiles({ throwOn: UpdateProfileCommand.name });
    mockDdb({});
    const res = await handler(authedEvent({ userProfile: { name: 'Ada' } }));
    assert.strictEqual(res.statusCode, 500);
    assert.match(res.body ?? '', /Internal error/);
    // The raw SDK error message must NOT leak to the client.
    assert.doesNotMatch(res.body ?? '', /Customer Profiles error|boom/);
  });

  void it('returns 500 when the profile cannot be resolved after create', async () => {
    // SearchProfiles never returns a ProfileId -> resolveOrCreateProfile throws.
    mockProfiles({ searchByKey: {} });
    mockDdb({});
    const res = await handler(authedEvent({ userProfile: { name: 'Ada' } }));
    assert.strictEqual(res.statusCode, 500);
  });
});
