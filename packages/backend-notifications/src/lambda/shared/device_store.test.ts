// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import type { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  deleteDevice,
  getDeviceOwner,
  queryDeviceIdsByProfile,
  upsertDeviceOwner,
} from './device_store.js';

type CommandLike = { constructor: { name: string }; input: any };

const NOW = Date.parse('2026-07-18T00:00:00.000Z');
const DAY = 24 * 60 * 60;

void describe('upsertDeviceOwner', () => {
  void it('issues an atomic LWW UpdateItem on the deviceId PK with if_not_exists(createdAt)', async () => {
    let captured: any;
    const ddb = {
      send: (command: CommandLike): Promise<unknown> => {
        captured = command.input;
        return Promise.resolve({});
      },
    } as unknown as DynamoDBClient;

    await upsertDeviceOwner(
      ddb,
      'Devices',
      {
        deviceId: 'd1',
        token: 'tok-1',
        profileId: 'p1',
        channelType: 'APNS',
        platform: 'iOS',
        appVersion: '1.2.3',
      },
      NOW,
    );

    assert.strictEqual(captured.TableName, 'Devices');
    assert.deepStrictEqual(captured.Key, { deviceId: { S: 'd1' } });
    assert.match(
      captured.UpdateExpression,
      /createdAt = if_not_exists\(createdAt, :now\)/,
    );
    assert.match(captured.UpdateExpression, /profileId = :profileId/);
    assert.strictEqual(captured.ExpressionAttributeValues[':token'].S, 'tok-1');
    assert.strictEqual(
      captured.ExpressionAttributeValues[':profileId'].S,
      'p1',
    );
    assert.strictEqual(
      captured.ExpressionAttributeValues[':channelType'].S,
      'APNS',
    );
    assert.strictEqual(
      captured.ExpressionAttributeValues[':platform'].S,
      'iOS',
    );
    // ttl = now + 90d (epoch seconds).
    assert.strictEqual(
      captured.ExpressionAttributeValues[':ttl'].N,
      String(Math.floor(NOW / 1000) + 90 * DAY),
    );
    assert.strictEqual(
      captured.ExpressionAttributeValues[':now'].S,
      new Date(NOW).toISOString(),
    );
  });

  void it('omits optional platform / appVersion / channelType when absent', async () => {
    let captured: any;
    const ddb = {
      send: (command: CommandLike): Promise<unknown> => {
        captured = command.input;
        return Promise.resolve({});
      },
    } as unknown as DynamoDBClient;

    await upsertDeviceOwner(
      ddb,
      'Devices',
      { deviceId: 'd1', token: 'tok-1', profileId: 'p1' },
      NOW,
    );

    assert.strictEqual(
      captured.ExpressionAttributeValues[':platform'],
      undefined,
    );
    assert.strictEqual(
      captured.ExpressionAttributeValues[':appVersion'],
      undefined,
    );
    assert.strictEqual(
      captured.ExpressionAttributeValues[':channelType'],
      undefined,
    );
    assert.ok(!/:platform/.test(captured.UpdateExpression));
  });

  void it('THROWS (after retries) so registration fails when the write fails', async () => {
    const ddb = {
      send: (): Promise<unknown> => {
        const err = new Error('nope');
        err.name = 'ValidationException';
        return Promise.reject(err);
      },
    } as unknown as DynamoDBClient;

    await assert.rejects(
      upsertDeviceOwner(
        ddb,
        'Devices',
        { deviceId: 'd1', token: 'tok-1', profileId: 'p1' },
        NOW,
      ),
    );
  });
});

void describe('queryDeviceIdsByProfile', () => {
  void it('queries the GSI and paginates, returning every deviceId', async () => {
    const pages = [
      {
        Items: [{ deviceId: { S: 'd1' } }, { deviceId: { S: 'd2' } }],
        LastEvaluatedKey: { deviceId: { S: 'd2' } },
      },
      { Items: [{ deviceId: { S: 'd3' } }] },
    ];
    let call = 0;
    const seen: any[] = [];
    const ddb = {
      send: (command: CommandLike): Promise<unknown> => {
        seen.push(command.input);
        return Promise.resolve(pages[call++]);
      },
    } as unknown as DynamoDBClient;

    const ids = await queryDeviceIdsByProfile(
      ddb,
      'Devices',
      'profileId-index',
      'p1',
    );
    assert.deepStrictEqual(ids, ['d1', 'd2', 'd3']);
    assert.strictEqual(seen[0].IndexName, 'profileId-index');
    assert.strictEqual(seen[0].ExpressionAttributeValues[':profileId'].S, 'p1');
    assert.deepStrictEqual(seen[1].ExclusiveStartKey, {
      deviceId: { S: 'd2' },
    });
  });
});

void describe('getDeviceOwner', () => {
  void it('does a strongly-consistent point read and maps the record', async () => {
    let captured: any;
    const ddb = {
      send: (command: CommandLike): Promise<unknown> => {
        captured = command.input;
        return Promise.resolve({
          Item: {
            deviceId: { S: 'd1' },
            token: { S: 'tok' },
            profileId: { S: 'p1' },
            channelType: { S: 'GCM' },
          },
        });
      },
    } as unknown as DynamoDBClient;

    const rec = await getDeviceOwner(ddb, 'Devices', 'd1');
    assert.strictEqual(captured.ConsistentRead, true);
    assert.deepStrictEqual(rec, {
      deviceId: 'd1',
      token: 'tok',
      profileId: 'p1',
      channelType: 'GCM',
    });
  });

  void it('returns undefined when the item is absent', async () => {
    const ddb = {
      send: (): Promise<unknown> => Promise.resolve({}),
    } as unknown as DynamoDBClient;
    assert.strictEqual(await getDeviceOwner(ddb, 'Devices', 'd1'), undefined);
  });

  void it('returns undefined when the item lacks token or profileId', async () => {
    const ddb = {
      send: (): Promise<unknown> =>
        Promise.resolve({ Item: { deviceId: { S: 'd1' } } }),
    } as unknown as DynamoDBClient;
    assert.strictEqual(await getDeviceOwner(ddb, 'Devices', 'd1'), undefined);
  });
});

void describe('deleteDevice', () => {
  void it('deletes by the deviceId PK and returns true', async () => {
    let captured: any;
    const ddb = {
      send: (command: CommandLike): Promise<unknown> => {
        captured = command.input;
        return Promise.resolve({});
      },
    } as unknown as DynamoDBClient;
    const ok = await deleteDevice(ddb, 'Devices', 'd1');
    assert.strictEqual(ok, true);
    assert.deepStrictEqual(captured.Key, { deviceId: { S: 'd1' } });
  });

  void it('swallows a failure and returns false (best-effort cleanup)', async () => {
    const ddb = {
      send: (): Promise<unknown> => Promise.reject(new Error('boom')),
    } as unknown as DynamoDBClient;
    assert.strictEqual(await deleteDevice(ddb, 'Devices', 'd1'), false);
  });
});
