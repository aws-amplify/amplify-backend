import {
  CustomerProfilesClient,
  PutProfileObjectCommand,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { withTransientRetry } from './retry.js';
import {
  OBJECT_TYPE_PROFILE,
  PRINCIPAL_ID_FIELD,
  PRINCIPAL_ID_KEY,
} from '../../constants.js';

export type ResolvedProfile = {
  profileId: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const PROFILE_SEARCH_MAX_ATTEMPTS = 8;
const PROFILE_SEARCH_BASE_DELAY_MS = 150;

/**
 * Look up the profile bound to `principalId` via the searchable
 * {@link PRINCIPAL_ID_KEY}, polling briefly to absorb SearchProfiles' eventual
 * consistency.
 */
const searchProfileId = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  principalId: string,
  attempts: number,
  baseDelayMs: number,
): Promise<string | undefined> => {
  for (let i = 0; i < attempts; i++) {
    const search = await profiles.send(
      new SearchProfilesCommand({
        DomainName: domainName,
        KeyName: PRINCIPAL_ID_KEY,
        Values: [principalId],
      }),
    );
    const found = search.Items?.find((item) => !!item.ProfileId)?.ProfileId;
    if (found) {
      return found;
    }
    if (i < attempts - 1) {
      await sleep(baseDelayMs * (i + 1));
    }
  }
  return undefined;
};

/**
 * Resolve (or create) the Customer Profiles profile bound to the verified
 * `principalId` via a single idempotent PutProfileObject find-or-create against
 * the sole {@link OBJECT_TYPE_PROFILE} object type (keyed PROFILE+UNIQUE by
 * `principalIdKey`), then read back the profileId via SearchProfiles (bounded
 * poll for eventual consistency). The PutProfileObject is wrapped in
 * {@link withTransientRetry} so transient throttling / concurrent-update errors
 * are retried with backoff.
 *
 * Because Customer Profiles enforces find-or-create atomically server-side on
 * the PROFILE+UNIQUE key, concurrent first-calls for the same identity converge
 * on a single profile — no duplicates, no create race.
 *
 * This is the DELIBERATELY ISOLATED identity-resolution seam: callers depend
 * only on the returned `profileId`, regardless of caller auth state (guest or
 * authenticated). Used by BOTH identify-user and register-device.
 * @throws if a profileId cannot be resolved after the bounded poll.
 */
export const resolveOrCreateProfile = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  principalId: string,
): Promise<ResolvedProfile> => {
  await withTransientRetry(() =>
    profiles.send(
      new PutProfileObjectCommand({
        DomainName: domainName,
        ObjectTypeName: OBJECT_TYPE_PROFILE,
        Object: JSON.stringify({ [PRINCIPAL_ID_FIELD]: principalId }),
      }),
    ),
  );

  const profileId = await searchProfileId(
    profiles,
    domainName,
    principalId,
    PROFILE_SEARCH_MAX_ATTEMPTS,
    PROFILE_SEARCH_BASE_DELAY_MS,
  );
  if (!profileId) {
    throw new Error(
      'PutProfileObject find-or-create did not resolve a ProfileId',
    );
  }
  return { profileId };
};
