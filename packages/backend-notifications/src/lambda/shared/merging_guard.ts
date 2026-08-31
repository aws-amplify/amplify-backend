// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CustomerProfilesClient,
  GetDomainCommand,
} from '@aws-sdk/client-customer-profiles';

import { ENV_MERGING_CHECK_TTL_MS } from '../../constants.js';
import {
  type MergingVerdict,
  evaluateMerging,
  isRetriableGetDomainError,
} from '../identity-resolution/check.js';

/**
 * How long a `GetDomain` verdict is served without revalidating. Chosen so a
 * customer who enables Identity Resolution out-of-band is locked out within
 * minutes, while a steady stream of writes costs at most one `GetDomain` per
 * container per TTL.
 */
export const MERGING_CHECK_TTL_MS = 5 * 60 * 1000;

/**
 * Upper bound on {@link ENV_MERGING_CHECK_TTL_MS}. The override exists to tune
 * the revalidation interval, NOT to switch the check off, so an out-of-range
 * value is clamped rather than honoured — otherwise a stray `TTL=99999999`
 * would keep serving a pre-drift verdict indefinitely.
 */
export const MERGING_CHECK_TTL_MAX_MS = 15 * 60 * 1000;

/**
 * Extra window BEYOND the TTL during which an expired verdict may still be
 * served, but ONLY when revalidation could not be completed. This is what makes
 * the check resilient rather than brittle: a `GetDomain` blip does not convert
 * into request failures while a recent verdict is still on hand. Past
 * TTL + grace the verdict is discarded and the write fails closed.
 */
export const MERGING_CHECK_STALE_GRACE_MS = 5 * 60 * 1000;

/** `GetDomain` attempts per revalidation. Deliberately small: request path. */
const GET_DOMAIN_ATTEMPTS = 3;

/** First backoff step; doubles per attempt (50ms + 100ms worst case). */
const GET_DOMAIN_BASE_DELAY_MS = 50;

/** Where the served verdict came from. Reported for observability. */
export type MergingFreshness =
  /** Revalidated against `GetDomain` during THIS request. */
  | 'fresh'
  /** Cache hit inside the TTL; no `GetDomain` call was made. */
  | 'cached'
  /** Expired verdict served because revalidation failed (see grace window). */
  | 'stale';

export type MergingGateDecision =
  | { outcome: 'allow'; freshness: MergingFreshness }
  | {
      outcome: 'reject-merging';
      freshness: MergingFreshness;
      verdict: Extract<MergingVerdict, { merging: true }>;
    }
  | { outcome: 'reject-unverified'; errorName: string };

/**
 * Caller-facing body for a write refused because merging IS enabled.
 *
 * Deliberately shorter than the deploy-time message: this one is returned over
 * the public API to end-user clients, so it names neither the domain nor the
 * mechanism. The actionable detail is logged instead, where only the app owner
 * can read it.
 */
export const MERGING_REJECTED_MESSAGE =
  'Profile writes are disabled: the Customer Profiles domain has Identity Resolution (profile merging) enabled';

/** Caller-facing body for a write refused because the check could not run. */
export const MERGING_UNVERIFIED_MESSAGE =
  'Could not verify that Identity Resolution is disabled on the Customer Profiles domain; the write was refused';

type CacheEntry = { verdict: MergingVerdict; storedAtMs: number };

/**
 * Module scope, so it is shared by every invocation served by this container and
 * dies with it. Keyed by domain name because the domain is read from the
 * environment per request and a container is never shared across stacks.
 */
const cache = new Map<string, CacheEntry>();

/**
 * Drop all cached verdicts. Exported for tests, which need each case to start
 * from a known cold or hand-seeded cache.
 */
export const clearMergingCache = (): void => {
  cache.clear();
};

/** Seed the cache directly. Test-only seam for the expiry / staleness cases. */
export const primeMergingCache = (
  domainName: string,
  verdict: MergingVerdict,
  storedAtMs: number,
): void => {
  cache.set(domainName, { verdict, storedAtMs });
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const resolveTtlMs = (): number => {
  const raw = process.env[ENV_MERGING_CHECK_TTL_MS];
  if (raw === undefined || raw === '') {
    return MERGING_CHECK_TTL_MS;
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.warn(
      `[merging-guard] ignoring invalid ${ENV_MERGING_CHECK_TTL_MS}, using default`,
    );
    return MERGING_CHECK_TTL_MS;
  }
  return Math.min(parsed, MERGING_CHECK_TTL_MAX_MS);
};

type FetchOutcome =
  | { ok: true; verdict: MergingVerdict }
  | { ok: false; errorName: string };

const fetchVerdict = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  attempts: number,
  baseDelayMs: number,
): Promise<FetchOutcome> => {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const domain = await profiles.send(
        new GetDomainCommand({ DomainName: domainName }),
      );
      return { ok: true, verdict: evaluateMerging(domain) };
    } catch (err) {
      lastErr = err;
      if (attempt === attempts || !isRetriableGetDomainError(err)) {
        break;
      }
      await sleep(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  return {
    ok: false,
    errorName: (lastErr as { name?: string })?.name ?? 'UnknownError',
  };
};

const decide = (
  verdict: MergingVerdict,
  freshness: MergingFreshness,
): MergingGateDecision =>
  verdict.merging
    ? { outcome: 'reject-merging', freshness, verdict }
    : { outcome: 'allow', freshness };

export type MergingGateOptions = {
  nowMs?: number;
  ttlMs?: number;
  staleGraceMs?: number;
  attempts?: number;
  baseDelayMs?: number;
};

/**
 * RUNTIME gate: decide whether a write may touch a Customer Profiles domain,
 * based on whether Identity Resolution (profile merging) is enabled on it RIGHT
 * NOW.
 *
 * This closes the drift window the deploy-time custom-resource guard cannot
 * reach. That guard runs once per deployment, so a customer who enables matching
 * on an attached domain the day AFTER a deploy would keep writing into a merging
 * domain until the next, possibly never, deployment. Merging combines profiles
 * across principals, which does not preserve the one-to-one mapping between the
 * caller principal and its profile that this package relies on.
 *
 * The verdict is derived by {@link evaluateMerging} — the same predicate the
 * deploy-time guard uses, so both layers agree on what "merging" means (either
 * mechanism enabled, any status).
 *
 * Caching and failure policy (stale-while-revalidate, fail CLOSED):
 *   - Inside the TTL a cached verdict is served as-is — no `GetDomain` call.
 *   - Once expired, `GetDomain` is retried briefly and the verdict refreshed.
 *   - If revalidation FAILS but the expired verdict is still within the stale
 *     grace window, that verdict is served. A transient `GetDomain` blip must
 *     not fail writes when merging was confirmed disabled moments ago.
 *   - With NO usable verdict (cold cache, or one older than TTL + grace) and no
 *     way to confirm merging is disabled, the write is REFUSED. Not being able
 *     to check is never treated as permission to proceed.
 *
 * A cached "merging enabled" verdict rejects for the rest of its TTL, so
 * re-disabling matching recovers automatically on the next revalidation.
 * @param profiles Client used for `GetDomain`. Shared with the write path so the
 * connection pool and user-agent configuration are reused.
 * @param domainName The attached Customer Profiles domain.
 * @param opts Overrides for time, TTL and retry budget. Tests only.
 * @returns Whether the caller may proceed, and why not if it may not.
 */
export const checkMergingDisabled = async (
  profiles: CustomerProfilesClient,
  domainName: string,
  opts: MergingGateOptions = {},
): Promise<MergingGateDecision> => {
  const now = opts.nowMs ?? Date.now();
  const ttlMs = opts.ttlMs ?? resolveTtlMs();
  const staleGraceMs = opts.staleGraceMs ?? MERGING_CHECK_STALE_GRACE_MS;

  const cached = cache.get(domainName);
  const ageMs = cached ? now - cached.storedAtMs : Number.POSITIVE_INFINITY;
  if (cached && ageMs >= 0 && ageMs < ttlMs) {
    return decide(cached.verdict, 'cached');
  }

  const fetched = await fetchVerdict(
    profiles,
    domainName,
    opts.attempts ?? GET_DOMAIN_ATTEMPTS,
    opts.baseDelayMs ?? GET_DOMAIN_BASE_DELAY_MS,
  );
  if (fetched.ok) {
    cache.set(domainName, { verdict: fetched.verdict, storedAtMs: now });
    return decide(fetched.verdict, 'fresh');
  }

  if (cached && ageMs >= 0 && ageMs < ttlMs + staleGraceMs) {
    console.warn(
      '[merging-guard] GetDomain failed; serving last verdict within its stale grace window',
      JSON.stringify({
        errorName: fetched.errorName,
        ageMs,
        merging: cached.verdict.merging,
      }),
    );
    return decide(cached.verdict, 'stale');
  }

  console.error(
    '[merging-guard] cannot confirm Identity Resolution is disabled; failing closed',
    JSON.stringify({
      errorName: fetched.errorName,
      cached: !!cached,
      ageMs: cached ? ageMs : undefined,
    }),
  );
  return { outcome: 'reject-unverified', errorName: fetched.errorName };
};
