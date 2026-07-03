import {
  CustomerProfilesClient,
  ListProfileObjectsCommand,
} from '@aws-sdk/client-customer-profiles';

import { OBJECT_TYPE_DEVICE } from '../../constants.js';
import { withTransientRetry } from '../shared/retry.js';

/**
 * Read back the IMMUTABLE `createdAt` of the existing AmplifyDevice object for
 * `deviceId` under the resolved profile, so a subsequent PutProfileObject (which
 * REPLACES the object for that key) can preserve the original first-registration
 * time while refreshing `updatedAt`.
 *
 * Pages through the profile's device objects and matches by `deviceId` (the
 * UNIQUE object key). Returns the stored `createdAt` when a prior object exists,
 * otherwise `undefined` so the caller sets a fresh `createdAt = now`.
 *
 * Best-effort and NEVER throws: any failure — a not-yet-propagated profile
 * (SearchProfiles / ListProfileObjects are eventually consistent), a transient
 * service error, or a permissions gap — simply yields `undefined` so the caller
 * re-seeds `createdAt` and device registration stays resilient.
 */
export const findExistingDeviceCreatedAt = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  profileId: string,
  deviceId: string,
): Promise<string | undefined> => {
  try {
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
        if (!item.Object) {
          continue;
        }
        try {
          const parsed = JSON.parse(item.Object) as Record<string, unknown>;
          if (
            parsed.deviceId === deviceId &&
            typeof parsed.createdAt === 'string' &&
            parsed.createdAt.length > 0
          ) {
            return parsed.createdAt;
          }
        } catch {
          // Ignore a malformed stored object; treat as no prior createdAt.
          continue;
        }
      }
      nextToken = res.NextToken;
    } while (nextToken);
  } catch {
    // Best-effort: ListProfileObjects unavailable / errored; the caller
    // re-seeds createdAt = now rather than failing device registration.
    return undefined;
  }
  return undefined;
};
