import {
  CustomerProfilesClient,
  PutProfileObjectCommand,
  SearchProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { withTransientRetry } from '../shared/retry.js';
import { Principal } from './principal.js';

export type ResolvedProfile = {
  profileId: string;
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Look up the profile bound to `value` via the searchable `keyName`, polling
 * briefly to absorb SearchProfiles' eventual consistency.
 */
const searchProfileId = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  keyName: string,
  value: string,
  attempts: number,
  baseDelayMs: number,
): Promise<string | undefined> => {
  for (let i = 0; i < attempts; i++) {
    const search = await profiles.send(
      new SearchProfilesCommand({
        DomainName: domainName,
        KeyName: keyName,
        Values: [value],
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
 * Resolve (or create) the Customer Profiles profile bound to a verified caller
 * ({@link Principal} — an authed `sub` or a guest `cognitoIdentityId`) via a
 * single idempotent PutProfileObject find-or-create against the AmplifyProfile
 * object type (keyed PROFILE+UNIQUE by the principal's key), then read back the
 * profileId via SearchProfiles (bounded poll for eventual consistency). The
 * PutProfileObject is wrapped in {@link withTransientRetry} so transient
 * throttling / concurrent-update errors are retried with backoff.
 *
 * Because Customer Profiles enforces find-or-create atomically server-side on
 * the PROFILE+UNIQUE key, concurrent first-logins for the same identity
 * converge on a single profile — no duplicates, no create race.
 *
 * This is the DELIBERATELY ISOLATED identity-resolution seam: callers depend
 * only on the returned `profileId`, regardless of auth mode.
 * @throws if a profileId cannot be resolved after the bounded poll.
 */
export const resolveOrCreateProfile = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  principal: Principal,
): Promise<ResolvedProfile> => {
  await withTransientRetry(() =>
    profiles.send(
      new PutProfileObjectCommand({
        DomainName: domainName,
        ObjectTypeName: principal.profileObjectType,
        Object: JSON.stringify({ [principal.objectField]: principal.value }),
      }),
    ),
  );

  const profileId = await searchProfileId(
    profiles,
    domainName,
    principal.keyName,
    principal.value,
    8,
    150,
  );
  if (!profileId) {
    throw new Error(
      'PutProfileObject find-or-create did not resolve a ProfileId',
    );
  }
  return { profileId };
};

/**
 * Find the profileId bound to a principal WITHOUT creating one (single
 * SearchProfiles, no poll). Returns `undefined` when no profile exists yet.
 * Used by merge-on-sign-in to locate a prior guest profile.
 *
 * A single attempt (no retry poll, unlike {@link resolveOrCreateProfile}) is
 * correct here: the guest profile, if any, was created on a PRIOR invocation —
 * not in this request — so there is no just-written object to wait for eventual
 * consistency on. A miss means "no guest profile", not "not yet visible".
 */
export const findProfileId = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  principal: Principal,
): Promise<string | undefined> =>
  searchProfileId(
    profiles,
    domainName,
    principal.keyName,
    principal.value,
    1,
    0,
  );
