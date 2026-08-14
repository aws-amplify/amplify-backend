/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';

import { ENV_MERGING_CHECK_TTL_MS } from '../../constants.js';
import {
  MERGING_CHECK_STALE_GRACE_MS,
  MERGING_CHECK_TTL_MAX_MS,
  MERGING_CHECK_TTL_MS,
  checkMergingDisabled,
  clearMergingCache,
  primeMergingCache,
} from './merging_guard.js';

/* eslint-disable @typescript-eslint/naming-convention -- Customer Profiles API
   response shapes are PascalCase by contract. */

const DOMAIN = 'amazon-connect-notifications-test';

const DISABLED_DOMAIN = {
  DomainName: DOMAIN,
  Matching: { Enabled: false },
  RuleBasedMatching: { Enabled: false },
};

/** Every GetDomain input the guard issued, in order. */
let getDomainInputs: any[];

/**
 * Install a GetDomain double. `responses` is consumed one entry per attempt: an
 * Error entry is thrown (simulating an SDK rejection), anything else resolves.
 * The LAST entry repeats once exhausted, so a steady-state can be expressed as a
 * single element.
 */
const installGetDomain = (responses: unknown[]): void => {
  getDomainInputs = [];
  mock.method(
    CustomerProfilesClient.prototype,
    'send',
    (command: any): Promise<unknown> => {
      assert.strictEqual(
        command.constructor.name,
        'GetDomainCommand',
        'the guard must only ever issue GetDomain',
      );
      getDomainInputs.push(command.input);
      const next =
        responses[Math.min(getDomainInputs.length - 1, responses.length - 1)];
      if (next instanceof Error) {
        return Promise.reject(next);
      }
      return Promise.resolve(next);
    },
  );
};

const profiles = new CustomerProfilesClient({ region: 'us-east-1' });

const throttling = (): Error => {
  const err = new Error('slow down');
  err.name = 'ThrottlingException';
  return err;
};

const notFound = (): Error => {
  const err = new Error('no such domain');
  err.name = 'ResourceNotFoundException';
  return err;
};

/** Zero backoff so the retry cases do not spend real time sleeping. */
const NO_SLEEP = { baseDelayMs: 0 };

void describe('checkMergingDisabled', () => {
  beforeEach(() => {
    clearMergingCache();
    delete process.env[ENV_MERGING_CHECK_TTL_MS];
  });

  afterEach(() => {
    mock.restoreAll();
    clearMergingCache();
    delete process.env[ENV_MERGING_CHECK_TTL_MS];
  });

  void describe('verdict', () => {
    void it('allows a domain with both mechanisms disabled, calling GetDomain once', async () => {
      installGetDomain([DISABLED_DOMAIN]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'allow',
        freshness: 'fresh',
      });
      assert.strictEqual(getDomainInputs.length, 1);
      assert.deepStrictEqual(getDomainInputs[0], { DomainName: DOMAIN });
    });

    void it('allows a domain with no matching configuration at all', async () => {
      installGetDomain([{ DomainName: DOMAIN }]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
      });

      assert.strictEqual(decision.outcome, 'allow');
    });

    void it('rejects ML matching (Matching.Enabled)', async () => {
      installGetDomain([{ Matching: { Enabled: true } }]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'reject-merging',
        freshness: 'fresh',
        verdict: { merging: true, mechanism: 'Matching' },
      });
    });

    void it('rejects rule-based matching that is still PENDING (any status counts)', async () => {
      // Enabling rule-based matching flips Enabled immediately but only becomes
      // ACTIVE up to ~an hour later. The write must be refused from the moment
      // the customer asks for merging, not an hour later.
      installGetDomain([
        {
          Matching: { Enabled: false },
          RuleBasedMatching: { Enabled: true, Status: 'PENDING' },
        },
      ]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'reject-merging',
        freshness: 'fresh',
        verdict: {
          merging: true,
          mechanism: 'RuleBasedMatching',
          status: 'PENDING',
        },
      });
    });
  });

  void describe('caching', () => {
    void it('serves a cache HIT inside the TTL without calling GetDomain again', async () => {
      installGetDomain([DISABLED_DOMAIN]);

      const first = await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const second = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS - 1,
      });

      assert.deepStrictEqual(first, { outcome: 'allow', freshness: 'fresh' });
      assert.deepStrictEqual(second, {
        outcome: 'allow',
        freshness: 'cached',
      });
      assert.strictEqual(
        getDomainInputs.length,
        1,
        'the second request must be served from cache',
      );
    });

    void it('revalidates once the TTL has EXPIRED', async () => {
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const afterExpiry = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS,
      });

      assert.deepStrictEqual(afterExpiry, {
        outcome: 'allow',
        freshness: 'fresh',
      });
      assert.strictEqual(getDomainInputs.length, 2);
    });

    void it('caches a merging-ENABLED verdict too, so a locked-out domain is not re-fetched per request', async () => {
      installGetDomain([{ Matching: { Enabled: true } }]);

      const first = await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const second = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 1000,
      });

      assert.strictEqual(first.outcome, 'reject-merging');
      assert.strictEqual(second.outcome, 'reject-merging');
      assert.strictEqual(second.freshness, 'cached');
      assert.strictEqual(getDomainInputs.length, 1);
    });

    void it('RECOVERS after the TTL when matching is disabled again', async () => {
      // The drift fix: re-disabling matching must restore writes on the next
      // revalidation, with no redeploy and no container recycle.
      installGetDomain([{ Matching: { Enabled: true } }, DISABLED_DOMAIN]);

      const locked = await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const recovered = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS,
      });

      assert.strictEqual(locked.outcome, 'reject-merging');
      assert.deepStrictEqual(recovered, {
        outcome: 'allow',
        freshness: 'fresh',
      });
    });

    void it('keys the cache per domain', async () => {
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      await checkMergingDisabled(profiles, 'other-domain', { nowMs: 0 });

      assert.deepStrictEqual(
        getDomainInputs.map((i) => i.DomainName),
        [DOMAIN, 'other-domain'],
      );
    });
  });

  void describe('fail-closed policy', () => {
    void it('FAILS CLOSED on a GetDomain error with a COLD cache', async () => {
      installGetDomain([throttling()]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
        ...NO_SLEEP,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'reject-unverified',
        errorName: 'ThrottlingException',
      });
    });

    void it('does NOT cache anything when the fetch failed, so a later success applies immediately', async () => {
      installGetDomain([
        throttling(),
        throttling(),
        throttling(),
        DISABLED_DOMAIN,
      ]);

      const failed = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
        ...NO_SLEEP,
      });
      const succeeded = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 1,
        ...NO_SLEEP,
      });

      assert.strictEqual(failed.outcome, 'reject-unverified');
      assert.deepStrictEqual(succeeded, {
        outcome: 'allow',
        freshness: 'fresh',
      });
    });

    void it('serves a STALE verdict when revalidation fails inside the grace window', async () => {
      // A GetDomain blip must not fail writes when merging was confirmed
      // disabled minutes ago.
      installGetDomain([throttling()]);
      primeMergingCache(DOMAIN, { merging: false }, 0);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS + 1,
        ...NO_SLEEP,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'allow',
        freshness: 'stale',
      });
    });

    void it('keeps REJECTING from a stale merging-enabled verdict when revalidation fails', async () => {
      installGetDomain([throttling()]);
      primeMergingCache(
        DOMAIN,
        { merging: true, mechanism: 'RuleBasedMatching', status: 'PENDING' },
        0,
      );

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS + 1,
        ...NO_SLEEP,
      });

      assert.strictEqual(decision.outcome, 'reject-merging');
      assert.strictEqual(decision.freshness, 'stale');
    });

    void it('FAILS CLOSED once the stale verdict outlives TTL + grace', async () => {
      installGetDomain([throttling()]);
      primeMergingCache(DOMAIN, { merging: false }, 0);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS + MERGING_CHECK_STALE_GRACE_MS,
        ...NO_SLEEP,
      });

      assert.strictEqual(decision.outcome, 'reject-unverified');
    });

    void it('measures the grace window from the LAST SUCCESSFUL fetch, not from first use', async () => {
      installGetDomain([DISABLED_DOMAIN, DISABLED_DOMAIN, throttling()]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      // A successful revalidation at the TTL boundary re-dates the entry...
      await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS,
      });
      // ...so this failure is still inside the grace window of THAT fetch,
      // even though it is far past the grace window of the original one.
      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS * 2 + 1,
        ...NO_SLEEP,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'allow',
        freshness: 'stale',
      });
    });
  });

  void describe('retries', () => {
    void it('retries a transient GetDomain error and accepts the eventual success', async () => {
      installGetDomain([throttling(), throttling(), DISABLED_DOMAIN]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
        ...NO_SLEEP,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'allow',
        freshness: 'fresh',
      });
      assert.strictEqual(getDomainInputs.length, 3);
    });

    void it('does NOT retry a non-retriable error, and still fails closed', async () => {
      installGetDomain([notFound()]);

      const decision = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
        ...NO_SLEEP,
      });

      assert.deepStrictEqual(decision, {
        outcome: 'reject-unverified',
        errorName: 'ResourceNotFoundException',
      });
      assert.strictEqual(
        getDomainInputs.length,
        1,
        'a missing domain is not worth retrying',
      );
    });

    void it('gives up after the attempt budget', async () => {
      installGetDomain([throttling()]);

      await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 0,
        attempts: 2,
        ...NO_SLEEP,
      });

      assert.strictEqual(getDomainInputs.length, 2);
    });
  });

  void describe('TTL override', () => {
    void it('applies a shorter TTL from the environment', async () => {
      process.env[ENV_MERGING_CHECK_TTL_MS] = '1000';
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const hit = await checkMergingDisabled(profiles, DOMAIN, { nowMs: 999 });
      const miss = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: 1000,
      });

      assert.deepStrictEqual(hit, { outcome: 'allow', freshness: 'cached' });
      assert.deepStrictEqual(miss, { outcome: 'allow', freshness: 'fresh' });
      assert.strictEqual(getDomainInputs.length, 2);
    });

    void it('CLAMPS an over-long TTL so the check cannot be disabled by configuration', async () => {
      process.env[ENV_MERGING_CHECK_TTL_MS] = String(24 * 60 * 60 * 1000);
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const beyondCap = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MAX_MS,
      });

      assert.deepStrictEqual(beyondCap, {
        outcome: 'allow',
        freshness: 'fresh',
      });
      assert.strictEqual(getDomainInputs.length, 2);
    });

    void it('ignores a non-numeric TTL and falls back to the default', async () => {
      process.env[ENV_MERGING_CHECK_TTL_MS] = 'not-a-number';
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      const hit = await checkMergingDisabled(profiles, DOMAIN, {
        nowMs: MERGING_CHECK_TTL_MS - 1,
      });

      assert.deepStrictEqual(hit, { outcome: 'allow', freshness: 'cached' });
      assert.strictEqual(getDomainInputs.length, 1);
    });

    void it('treats TTL=0 as always revalidate', async () => {
      process.env[ENV_MERGING_CHECK_TTL_MS] = '0';
      installGetDomain([DISABLED_DOMAIN]);

      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });
      await checkMergingDisabled(profiles, DOMAIN, { nowMs: 0 });

      assert.strictEqual(getDomainInputs.length, 2);
    });
  });
});
