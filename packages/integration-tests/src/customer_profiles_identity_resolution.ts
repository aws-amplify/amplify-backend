// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import assert from 'assert';
import {
  CustomerProfilesClient,
  GetDomainCommand,
} from '@aws-sdk/client-customer-profiles';

/**
 * The Identity Resolution (profile merging) configuration of a Customer
 * Profiles domain, flattened from `GetDomain`.
 *
 * A domain reports BOTH mechanisms independently, and a disabled mechanism is
 * returned as an ABSENT block rather than `Enabled: false` — so `undefined` and
 * `false` both mean "off".
 */
export type IdentityResolutionState = {
  /** `Matching.Enabled` — the ML / weekly batch identity-resolution job. */
  matchingEnabled: boolean;
  /** `RuleBasedMatching.Enabled` — rule-based (real-time) matching. */
  ruleBasedMatchingEnabled: boolean;
  /**
   * `RuleBasedMatching.Status`, when present. Enabling rule-based matching
   * reports `PENDING` immediately and only reaches `ACTIVE` up to ~an hour
   * later, so a test must never wait for `ACTIVE` to treat it as enabled.
   */
  ruleBasedMatchingStatus?: string;
};

/**
 * Read the Identity Resolution configuration of a Customer Profiles domain.
 * @param client Customer Profiles client.
 * @param domainName The domain to inspect.
 * @returns Which mechanisms are enabled on the domain right now.
 */
export const readIdentityResolution = async (
  client: CustomerProfilesClient,
  domainName: string,
): Promise<IdentityResolutionState> => {
  const domain = await client.send(
    new GetDomainCommand({ DomainName: domainName }),
  );
  return {
    matchingEnabled: domain.Matching?.Enabled === true,
    ruleBasedMatchingEnabled: domain.RuleBasedMatching?.Enabled === true,
    ...(domain.RuleBasedMatching?.Status
      ? { ruleBasedMatchingStatus: domain.RuleBasedMatching.Status }
      : {}),
  };
};

/** True when NEITHER Identity Resolution mechanism is enabled. */
export const isIdentityResolutionDisabled = (
  state: IdentityResolutionState,
): boolean => !state.matchingEnabled && !state.ruleBasedMatchingEnabled;

/**
 * Assert that a Customer Profiles domain has BOTH Identity Resolution
 * mechanisms disabled.
 *
 * This is the compatibility contract `defineNotifications` depends on: profiles
 * are keyed by the server-derived caller `principalId`, so the mapping between
 * a principal and its profile has to stay one-to-one, which profile merging
 * does not preserve because it combines profiles across principals.
 * @param client Customer Profiles client.
 * @param domainName The domain to inspect.
 * @returns The observed state, for further assertions.
 */
export const assertIdentityResolutionDisabled = async (
  client: CustomerProfilesClient,
  domainName: string,
): Promise<IdentityResolutionState> => {
  const state = await readIdentityResolution(client, domainName);
  assert.strictEqual(
    state.matchingEnabled,
    false,
    `Expected Matching to be disabled on domain '${domainName}', got ${JSON.stringify(state)}`,
  );
  assert.strictEqual(
    state.ruleBasedMatchingEnabled,
    false,
    `Expected RuleBasedMatching to be disabled on domain '${domainName}', got ${JSON.stringify(state)}`,
  );
  return state;
};

/**
 * Poll `GetDomain` until the domain reports Identity Resolution as enabled, so
 * a test never asserts against a stale read of a configuration change it just
 * made.
 *
 * Only the `Enabled` flags are waited on — deliberately NOT
 * `RuleBasedMatching.Status`, which sits at `PENDING` for up to ~an hour after
 * being enabled.
 * @param client Customer Profiles client.
 * @param domainName The domain to inspect.
 * @param attempts Number of polls before giving up.
 * @param baseDelayMs First backoff step, scaled linearly per attempt.
 * @returns The observed state once it matches.
 */
export const waitForIdentityResolutionEnabled = async (
  client: CustomerProfilesClient,
  domainName: string,
  attempts: number = 10,
  baseDelayMs: number = 1000,
): Promise<IdentityResolutionState> => {
  let state = await readIdentityResolution(client, domainName);
  for (let i = 0; i < attempts; i++) {
    if (!isIdentityResolutionDisabled(state)) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (i + 1)));
    state = await readIdentityResolution(client, domainName);
  }
  throw new Error(
    `Domain '${domainName}' did not report Identity Resolution enabled in time; ` +
      `last state ${JSON.stringify(state)}`,
  );
};
