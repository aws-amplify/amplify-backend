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
 * Evict a device from every profile OTHER than the one it was just registered
 * on. Called on the AUTHENTICATED identify-with-device path so a device that
 * previously lived on a guest (or any other) profile can no longer receive push
 * for a different identity once the user signs in — closing the cross-user
 * misdelivery window WITHOUT any profile merge.
 *
 * Mechanic:
 *   1. `SearchProfiles(KeyName=deviceSearchKey, Values=[deviceId])` finds every
 *      profile carrying the device (via the SECONDARY search key).
 *   2. For each resolved profile that is NOT `keepProfileId`, page its
 *      AmplifyDevice objects, match by `deviceId`, and delete the matching
 *      object by its ProfileObjectUniqueKey.
 *
 * BEST-EFFORT and NEVER throws: SearchProfiles is eventually consistent (a
 * just-written device may not be indexed yet), so this is idempotent — a later
 * identify re-runs it. Any failure is logged (error name only) and swallowed so
 * it can never fail the device registration that already succeeded. Only a
 * derived `evicted` count is returned/logged; identity values, deviceId and
 * tokens are never logged (PII).
 */
export const evictDeviceFromOtherProfiles = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  deviceId: string,
  keepProfileId: string,
): Promise<EvictionOutcome> => {
  let evicted = 0;
  try {
    const search = await withTransientRetry(() =>
      profiles.send(
        new SearchProfilesCommand({
          DomainName: domainName,
          KeyName: DEVICE_SEARCH_KEY,
          Values: [deviceId],
        }),
      ),
    );

    const otherProfileIds = [
      ...new Set(
        (search.Items ?? [])
          .map((item) => item.ProfileId)
          .filter(
            (id): id is string =>
              typeof id === 'string' && id !== keepProfileId,
          ),
      ),
    ];

    for (const profileId of otherProfileIds) {
      const devices = await listDevices(
        profiles,
        domainName,
        profileId,
        'identify',
      );
      const matches = devices.filter((d) => d.deviceId === deviceId);
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

  // Operational signal only: how many stale device objects were evicted.
  console.log('[identify] deviceEviction', JSON.stringify({ evicted }));
  return { evicted };
};
