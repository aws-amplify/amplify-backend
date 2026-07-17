// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CustomerProfilesClient,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { DEVICE_SEARCH_KEY } from '../../constants.js';
import { withTransientRetry } from '../shared/retry.js';
import { deleteDevice, listDevices } from '../shared/devices.js';

export type EvictionOutcome = {
  /** Count of device objects deleted off OTHER profiles. */
  evicted: number;
};

/**
 * Evict a device from profiles OTHER than the one it was just registered on,
 * TOKEN-MATCHED: only delete a device object whose stored deviceToken equals the
 * push token the caller just presented (`incomingToken`). Applied UNIFORMLY on
 * both the authenticated and guest identify paths (no per-path asymmetry).
 *
 * Why token-matched: the live push token proves the caller is the actual
 * physical device re-homing itself (logout, shared device, guest<->auth switch),
 * so exactly one profile ends up holding a given physical device. A remote
 * attacker who knows only a (high-entropy) deviceId but NOT the device's live
 * token gets a token mismatch and evicts nothing — closing the cross-profile
 * push-suppression vector on both paths. A stored token that does not match is
 * left in place; a dead token is reaped by TTL + push-time dead-token cleanup.
 *
 * Mechanic:
 *   1. Paginated `SearchProfiles(KeyName=deviceSearchKey, Values=[deviceId])`
 *      over NextToken → candidate profileIds (excluding keepProfileId, deduped).
 *   2. For each candidate, page its AmplifyDevice objects (ListProfileObjects)
 *      and delete every object whose `deviceId` matches AND whose stored
 *      `deviceToken` equals `incomingToken`, by its ProfileObjectUniqueKey.
 *
 * BEST-EFFORT and NEVER throws: SearchProfiles is eventually consistent (a
 * just-written device may not be indexed yet), so this is idempotent — a later
 * identify re-runs it. Any failure is logged (error name only) and swallowed so
 * it can never fail the device registration that already succeeded. PII-safe:
 * the token, deviceToken and identity values are NEVER logged — only a derived
 * `evicted` count and an error name.
 */
export const evictDeviceFromOtherProfiles = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  deviceId: string,
  keepProfileId: string,
  incomingToken: string | undefined,
): Promise<EvictionOutcome> => {
  let evicted = 0;
  // No incoming token means the caller cannot prove it holds the physical
  // device, so there is nothing to token-match against: skip eviction entirely.
  if (!incomingToken) {
    console.log('[identify] deviceEviction', JSON.stringify({ evicted }));
    return { evicted };
  }
  try {
    // Page through SearchProfiles, accumulating every OTHER profile carrying the
    // device (de-duplicated; the keep profile is never evicted).
    const otherProfileIds = new Set<string>();
    let nextToken: string | undefined;
    do {
      const search = await withTransientRetry(() =>
        profiles.send(
          new SearchProfilesCommand({
            DomainName: domainName,
            KeyName: DEVICE_SEARCH_KEY,
            Values: [deviceId],
            NextToken: nextToken,
          }),
        ),
      );
      for (const item of search.Items ?? []) {
        const id = item.ProfileId;
        if (typeof id === 'string' && id !== keepProfileId) {
          otherProfileIds.add(id);
        }
      }
      nextToken = search.NextToken;
    } while (nextToken);

    for (const profileId of otherProfileIds) {
      const devices = await listDevices(
        profiles,
        domainName,
        profileId,
        'identify',
      );
      // Token-matched: only evict the object that is THIS physical device (same
      // deviceId AND same live token). A different stored token is left alone.
      const matches = devices.filter(
        (d) => d.deviceId === deviceId && d.deviceToken === incomingToken,
      );
      for (const device of matches) {
        const ok = await deleteDevice(
          profiles,
          domainName,
          profileId,
          device.objectUniqueKey,
        );
        if (ok) {
          evicted += 1;
        }
      }
    }
  } catch (err) {
    const name = err instanceof Error ? err.name : 'UnknownError';
    console.error('[identify] deviceEvictionError', JSON.stringify({ name }));
  }

  console.log('[identify] deviceEviction', JSON.stringify({ evicted }));
  return { evicted };
};
