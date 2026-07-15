// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CustomerProfilesClient,
  DeleteProfileObjectCommand,
  ListProfileObjectsCommand,
} from '@aws-sdk/client-customer-profiles';

import { OBJECT_TYPE_DEVICE } from '../../constants.js';
import { withTransientRetry } from './retry.js';

/** A registered device resolved from the profile's AmplifyDevice objects. */
export type ResolvedDevice = {
  /** The mutable push token / endpoint address. */
  deviceToken: string;
  /** The stored channel identifier (raw, pre-normalization). */
  channelType?: string;
  /** The stable device id, if present (for logging / diagnostics / eviction). */
  deviceId?: string;
  /**
   * The service-generated ProfileObjectUniqueKey — required to delete the
   * object during stale-token cleanup or cross-profile eviction.
   */
  objectUniqueKey: string;
};

/**
 * Resolve every registered device for a profile by paging through its
 * AmplifyDevice objects (ListProfileObjects) and extracting the push token +
 * channel + the ProfileObjectUniqueKey (needed for deletion).
 *
 * Device objects missing a token are skipped. Malformed stored objects are
 * ignored rather than aborting the whole profile. Wrapped in
 * {@link withTransientRetry} so transient throttling is retried with backoff.
 *
 * `logContext` tags the operational log line so the two callers — push delivery
 * and identify-time eviction — are distinguishable in CloudWatch.
 */
export const listDevices = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  profileId: string,
  logContext = 'push',
): Promise<ResolvedDevice[]> => {
  const devices: ResolvedDevice[] = [];
  let nextToken: string | undefined;

  do {
    const res = await withTransientRetry(() =>
      profiles.send(
        new ListProfileObjectsCommand({
          DomainName: domainName,
          ObjectTypeName: OBJECT_TYPE_DEVICE,
          ProfileId: profileId,
          NextToken: nextToken,
        }),
      ),
    );

    for (const item of res.Items ?? []) {
      const uniqueKey = item.ProfileObjectUniqueKey;
      if (!item.Object || !uniqueKey) {
        continue;
      }
      let parsed: Record<string, unknown>;
      try {
        parsed = JSON.parse(item.Object) as Record<string, unknown>;
      } catch {
        continue;
      }
      const deviceToken =
        typeof parsed.deviceToken === 'string' ? parsed.deviceToken : undefined;
      if (!deviceToken) {
        continue;
      }
      devices.push({
        deviceToken,
        channelType:
          typeof parsed.channelType === 'string'
            ? parsed.channelType
            : undefined,
        deviceId:
          typeof parsed.deviceId === 'string' ? parsed.deviceId : undefined,
        objectUniqueKey: uniqueKey,
      });
    }
    nextToken = res.NextToken;
  } while (nextToken);

  // Operational signal only: how many devices resolved and their channel types
  // (non-personal). Profile id, device ids and tokens are NOT logged.
  console.log(
    `[${logContext}] devices.resolved`,
    JSON.stringify({
      count: devices.length,
      channelTypes: devices.map((d) => d.channelType ?? '(none)'),
    }),
  );

  return devices;
};

/**
 * Delete a single AmplifyDevice object by its ProfileObjectUniqueKey. Used by
 * push-time stale-token cleanup (after a token was permanently rejected) AND by
 * identify-time cross-profile eviction. Best-effort: a failed delete is
 * swallowed so it never masks the caller's result — the object simply lingers
 * until the next cleanup or its TTL expiry.
 *
 * Returns `true` when the delete succeeded, `false` otherwise.
 */
export const deleteDevice = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  profileId: string,
  objectUniqueKey: string,
): Promise<boolean> => {
  try {
    await withTransientRetry(() =>
      profiles.send(
        new DeleteProfileObjectCommand({
          DomainName: domainName,
          ProfileId: profileId,
          ObjectTypeName: OBJECT_TYPE_DEVICE,
          ProfileObjectUniqueKey: objectUniqueKey,
        }),
      ),
    );
    return true;
  } catch (err) {
    // Log the failure name / object key only — no profile id and no raw error
    // object (which can carry request content). objectUniqueKey is a
    // service-generated opaque UUID (a ProfileObjectUniqueKey), not a user
    // identifier, so it is safe to log.
    console.error(
      '[devices] cleanup.deleteFailed',
      JSON.stringify({
        objectUniqueKey,
        error: err instanceof Error ? err.name : 'unknown',
      }),
    );
    return false;
  }
};
