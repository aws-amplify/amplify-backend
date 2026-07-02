import {
  CustomerProfilesClient,
  PutProfileObjectCommand,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { COGNITO_USER_KEY, OBJECT_TYPE_PROFILE } from '../constants.js';
import { withTransientRetry } from './retry.js';

export type ResolvedProfile = {
  profileId: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Look up the profile bound to `sub` via the searchable `cognitoUserKey`,
 * polling briefly to absorb SearchProfiles' eventual consistency.
 */
const searchProfileId = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  sub: string,
  attempts: number,
  baseDelayMs: number,
): Promise<string | undefined> => {
  for (let i = 0; i < attempts; i++) {
    const search = await profiles.send(
      new SearchProfilesCommand({
        DomainName: domainName,
        KeyName: COGNITO_USER_KEY,
        Values: [sub],
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
 * Resolve (or create) the Customer Profiles profile bound to a verified Cognito
 * subject via a single idempotent PutProfileObject find-or-create against the
 * AmplifyProfile object type (keyed by `cognitoUserKey` PROFILE+UNIQUE), then
 * read back the profileId via SearchProfiles (bounded poll for eventual
 * consistency). The PutProfileObject is wrapped in {@link withTransientRetry}
 * so transient throttling / concurrent-update errors are retried with backoff.
 *
 * Because Customer Profiles enforces find-or-create atomically server-side on
 * the PROFILE+UNIQUE key, concurrent first-logins for the same sub converge on
 * a single profile — no duplicates, no create race.
 *
 * This is the DELIBERATELY ISOLATED identity-resolution seam: callers depend
 * only on the returned `profileId`.
 * @throws if a profileId cannot be resolved after the bounded poll.
 */
export const resolveOrCreateProfile = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  sub: string,
): Promise<ResolvedProfile> => {
  await withTransientRetry(() =>
    profiles.send(
      new PutProfileObjectCommand({
        DomainName: domainName,
        ObjectTypeName: OBJECT_TYPE_PROFILE,
        Object: JSON.stringify({ cognitoSub: sub }),
      }),
    ),
  );

  const profileId = await searchProfileId(profiles, domainName, sub, 8, 150);
  if (!profileId) {
    throw new Error(
      'PutProfileObject find-or-create did not resolve a ProfileId',
    );
  }
  return { profileId };
};
