import {
  CustomerProfilesClient,
  MergeProfilesCommand,
} from '@aws-sdk/client-customer-profiles';

import { withTransientRetry } from '../shared/retry.js';
import { findProfileId } from './profile_resolver.js';
import { guestPrincipal } from './principal.js';

export type MergeOutcome = {
  /** `true` when a distinct guest profile was found and merged. */
  merged: boolean;
};

/**
 * Merge-on-sign-in: fold a prior GUEST profile (keyed by `cognitoIdentityKey =
 * guestIdentityId`) into the resolved AUTHENTICATED profile.
 *
 * Uses {@link MergeProfilesCommand}, which atomically (server-side Lambda job):
 *   1. moves all profileKeys from the guest profile to the authed profile,
 *   2. moves all OBJECTS (the guest's AmplifyDevice objects) to the authed
 *      profile,
 *   3. deletes the now-empty guest profile.
 *
 * This is the deterministic mechanic (vs AddProfileKey, which only adds a lookup
 * key, does not carry device objects, and risks an ambiguous-match rejection
 * when the guest key already resolves to a distinct profile).
 *
 * No-ops (returns `{merged:false}`) when there is no prior guest profile, or the
 * guest identity already resolves to the SAME profile (idempotent re-runs).
 * Best-effort: a merge failure is surfaced to the caller to log, but never
 * corrupts the primary identify result.
 */
export const mergeGuestIntoAuthed = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  guestIdentityId: string,
  authedProfileId: string,
): Promise<MergeOutcome> => {
  const guestProfileId = await findProfileId(
    profiles,
    domainName,
    guestPrincipal(guestIdentityId),
  );

  if (!guestProfileId || guestProfileId === authedProfileId) {
    return { merged: false };
  }

  await withTransientRetry(() =>
    profiles.send(
      new MergeProfilesCommand({
        DomainName: domainName,
        MainProfileId: authedProfileId,
        ProfileIdsToBeMerged: [guestProfileId],
      }),
    ),
  );

  return { merged: true };
};
