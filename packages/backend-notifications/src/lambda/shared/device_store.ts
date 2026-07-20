// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/naming-convention -- DynamoDB
   AttributeValue descriptors (`S`, `N`) are single-character by the AWS SDK
   wire contract, not app-chosen identifiers. */

import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  QueryCommand,
  UpdateItemCommand,
} from '@aws-sdk/client-dynamodb';

import { DEVICE_TTL_DAYS } from '../../constants.js';
import { withTransientRetry } from './retry.js';

// All DynamoDB calls below reuse `withTransientRetry` (originally tuned for
// Customer Profiles) purely for its `ThrottlingException` coverage — relevant
// to DynamoDB too. The table is PAY_PER_REQUEST, so provisioned-throughput
// errors don't apply, and the retry predicate deliberately does NOT retry
// `ConditionalCheckFailedException` (see deleteDevice).

/**
 * The authoritative device record stored in the DynamoDB Devices table.
 *
 * The table is the SINGLE SOURCE OF TRUTH for device ownership: PK = the stable
 * per-install `deviceId`, so a device physically lives on exactly one profile
 * at any instant. Ownership changes are strongly-consistent last-writer-wins
 * UpdateItems on that PK (register/re-home), and delivery gates on a
 * strongly-consistent point read of the same PK — so there is no
 * eventual-consistency window in the correctness path.
 */
export type DeviceRecord = {
  /** Stable per-install device id (the table partition key). */
  deviceId: string;
  /** The mutable push token / endpoint address. */
  token: string;
  /** The profile that currently OWNS this device (delivery owner / GSI key). */
  profileId: string;
  /**
   * The verified caller `principalId` that currently owns this device. Stored
   * so client-initiated ops (register / remove-device) can gate ownership
   * directly without re-resolving a profile. Delivery still keys on profileId.
   */
  principalId?: string;
  /** The stored channel identifier (raw, pre-normalization). */
  channelType?: string;
};

const SECONDS_PER_DAY = 24 * 60 * 60;

/** Epoch-seconds TTL `DEVICE_TTL_DAYS` in the future from `now`. */
const ttlFromNow = (nowMs: number): number =>
  Math.floor(nowMs / 1000) + DEVICE_TTL_DAYS * SECONDS_PER_DAY;

/**
 * Register (or RE-HOME) a device to `profileId` via a strongly-consistent,
 * atomic last-writer-wins UpdateItem on the `deviceId` PK. Overwriting the item
 * IS the eviction — no cross-profile search, no read-before-write.
 *
 * `createdAt` is preserved across writes with `if_not_exists`; `updatedAt` and
 * `ttl` are refreshed on every write. Optional `platform` / `appVersion` are set
 * only when present.
 *
 * This is the CRITICAL COMMIT of device registration: it THROWS on failure
 * (after transient retries) so the caller can fail the registration rather than
 * leave ownership stale.
 */
export const upsertDeviceOwner = async (
  ddb: DynamoDBClient,
  tableName: string,
  record: {
    deviceId: string;
    token: string;
    profileId: string;
    principalId: string;
    channelType?: string;
    platform?: string;
    appVersion?: string;
  },
  now: number = Date.now(),
): Promise<void> => {
  const nowIso = new Date(now).toISOString();

  const setClauses = [
    '#token = :token',
    'profileId = :profileId',
    'principalId = :principalId',
    'updatedAt = :now',
    '#ttl = :ttl',
    'createdAt = if_not_exists(createdAt, :now)',
  ];
  const names: Record<string, string> = {
    '#token': 'token',
    '#ttl': 'ttl',
  };
  const values: Record<string, { S: string } | { N: string }> = {
    ':token': { S: record.token },
    ':profileId': { S: record.profileId },
    ':principalId': { S: record.principalId },
    ':now': { S: nowIso },
    ':ttl': { N: String(ttlFromNow(now)) },
  };

  const optional: Array<[string, string | undefined]> = [
    ['channelType', record.channelType],
    ['platform', record.platform],
    ['appVersion', record.appVersion],
  ];
  for (const [attr, value] of optional) {
    if (value !== undefined) {
      setClauses.push(`${attr} = :${attr}`);
      values[`:${attr}`] = { S: value };
    }
  }

  await withTransientRetry(() =>
    ddb.send(
      new UpdateItemCommand({
        TableName: tableName,
        Key: { deviceId: { S: record.deviceId } },
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    ),
  );
};

/**
 * Enumerate the CANDIDATE devices for a profile via the eventually-consistent
 * GSI(profileId). Returns only the `deviceId`s — the authoritative token /
 * owner / channel are read per-device by {@link getDeviceOwner} under the
 * strongly-consistent ownership gate, so a stale GSI entry can never cause a
 * wrong delivery.
 */
export const queryDeviceIdsByProfile = async (
  ddb: DynamoDBClient,
  tableName: string,
  indexName: string,
  profileId: string,
): Promise<string[]> => {
  const deviceIds: string[] = [];
  let exclusiveStartKey: Record<string, { S: string }> | undefined;

  do {
    const res = await withTransientRetry(() =>
      ddb.send(
        new QueryCommand({
          TableName: tableName,
          IndexName: indexName,
          KeyConditionExpression: 'profileId = :profileId',
          ExpressionAttributeValues: { ':profileId': { S: profileId } },
          ProjectionExpression: 'deviceId',
          ExclusiveStartKey: exclusiveStartKey,
        }),
      ),
    );
    for (const item of res.Items ?? []) {
      const deviceId = item.deviceId?.S;
      if (deviceId) {
        deviceIds.push(deviceId);
      }
    }
    exclusiveStartKey = res.LastEvaluatedKey as
      | Record<string, { S: string }>
      | undefined;
  } while (exclusiveStartKey);

  console.log(
    '[push] devices.enumerated',
    JSON.stringify({ count: deviceIds.length }),
  );
  return deviceIds;
};

/**
 * Strongly-consistent point read of a device by its PK — the OWNERSHIP GATE.
 * Returns the authoritative current record (token + owning profileId + channel)
 * or `undefined` when the device no longer exists. Wrapped in transient retry.
 */
export const getDeviceOwner = async (
  ddb: DynamoDBClient,
  tableName: string,
  deviceId: string,
): Promise<DeviceRecord | undefined> => {
  const res = await withTransientRetry(() =>
    ddb.send(
      new GetItemCommand({
        TableName: tableName,
        Key: { deviceId: { S: deviceId } },
        ConsistentRead: true,
      }),
    ),
  );
  const item = res.Item;
  if (!item) {
    return undefined;
  }
  const token = item.token?.S;
  const profileId = item.profileId?.S;
  if (!token || !profileId) {
    return undefined;
  }
  return {
    deviceId,
    token,
    profileId,
    principalId: item.principalId?.S,
    channelType: item.channelType?.S,
  };
};

/**
 * Delete a device record by its PK, CONDITIONAL on the caller still being the
 * owning `principalId`. This is the ownership-gated client de-registration
 * (sign-out / explicit de-registration): the device carries its owning `principalId`
 * attribute, so removal is gated directly with NO profile resolution.
 *
 * The delete only fires when the stored `principalId` still equals the caller's
 * `principalId`. If the device was re-homed to a DIFFERENT principal since, the
 * `ConditionExpression` fails with `ConditionalCheckFailedException` — that is
 * the expected "not yours anymore" no-op case (returns `false`), NOT an error,
 * so remove-device stays idempotent. A missing item likewise yields
 * `ConditionalCheckFailedException` (no `principalId` to match) and is a no-op.
 *
 * `withTransientRetry` (tuned for Customer Profiles) is reused purely for its
 * `ThrottlingException` coverage; it deliberately does NOT retry
 * `ConditionalCheckFailedException`.
 * @throws on any non-conditional failure so the caller can surface a 500.
 */
export const deleteDeviceByPrincipal = async (
  ddb: DynamoDBClient,
  tableName: string,
  deviceId: string,
  principalId: string,
): Promise<boolean> => {
  try {
    await withTransientRetry(() =>
      ddb.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: { deviceId: { S: deviceId } },
          ConditionExpression: 'principalId = :caller',
          ExpressionAttributeValues: { ':caller': { S: principalId } },
        }),
      ),
    );
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown';
    if (name === 'ConditionalCheckFailedException') {
      // Not owned by the caller (re-homed) or already gone — idempotent no-op.
      console.log(
        '[devices] remove.skip',
        JSON.stringify({ deviceId, reason: 'not_owner_or_absent' }),
      );
      return false;
    }
    throw err;
  }
};

/**
 * Delete a device record by its PK as dead-token cleanup after a permanently
 * rejected send — CONDITIONAL on the token still being the one that failed.
 *
 * The delete only fires when the stored `token` still equals `staleToken`, so
 * a device that was re-registered (new token, possibly a new owner) between the
 * failed send and this cleanup is NOT removed. A `ConditionalCheckFailedException`
 * means exactly that "re-registered in the meantime" case: it is expected, not
 * an error — logged and swallowed (returns `false`).
 *
 * Best-effort otherwise: any failure is swallowed so it never masks the
 * caller's delivery result — the record simply lingers until its TTL expiry.
 * `deviceId` is a high-entropy client identifier, not personal data, so it is
 * safe to log.
 *
 * `withTransientRetry` (tuned for Customer Profiles) is reused here purely for
 * its `ThrottlingException` coverage; the table is PAY_PER_REQUEST so
 * provisioned-throughput errors don't apply, and it deliberately does NOT retry
 * `ConditionalCheckFailedException`.
 */
export const deleteDevice = async (
  ddb: DynamoDBClient,
  tableName: string,
  deviceId: string,
  staleToken: string,
): Promise<boolean> => {
  try {
    await withTransientRetry(() =>
      ddb.send(
        new DeleteItemCommand({
          TableName: tableName,
          Key: { deviceId: { S: deviceId } },
          ConditionExpression: '#token = :stale',
          ExpressionAttributeNames: { '#token': 'token' },
          ExpressionAttributeValues: { ':stale': { S: staleToken } },
        }),
      ),
    );
    return true;
  } catch (err) {
    const name = err instanceof Error ? err.name : 'unknown';
    if (name === 'ConditionalCheckFailedException') {
      // The device was re-registered with a different token since the failed
      // send — leave the current (live) record intact.
      console.log(
        '[devices] cleanup.skip',
        JSON.stringify({ deviceId, reason: 'token_changed' }),
      );
      return false;
    }
    console.error(
      '[devices] cleanup.deleteFailed',
      JSON.stringify({ deviceId, error: name }),
    );
    return false;
  }
};
