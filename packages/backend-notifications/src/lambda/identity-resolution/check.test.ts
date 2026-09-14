// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DomainMatchingView,
  evaluateMerging,
  isRetriableGetDomainError,
  mergingEnabledMessage,
} from './check.js';

/* eslint-disable @typescript-eslint/naming-convention -- Customer Profiles API
   response shapes are PascalCase by contract. */

void describe('evaluateMerging', () => {
  void it('allows a domain with no matching configuration at all', () => {
    assert.deepStrictEqual(evaluateMerging({}), { merging: false });
  });

  void it('allows a domain with both mechanisms explicitly disabled', () => {
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: false },
        RuleBasedMatching: { Enabled: false },
      }),
      { merging: false },
    );
  });

  void it('allows a domain with a disabled rule-based block that still carries a status', () => {
    // Disabling rule-based matching leaves the block behind with Enabled:false;
    // a stale/terminal Status must NOT be read as merging.
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: false },
        RuleBasedMatching: { Enabled: false, Status: 'ACTIVE' },
      }),
      { merging: false },
    );
  });

  void it('refuses ML matching (Matching.Enabled)', () => {
    assert.deepStrictEqual(evaluateMerging({ Matching: { Enabled: true } }), {
      merging: true,
      mechanism: 'Matching',
    });
  });

  void it('refuses auto-merging even if Matching.Enabled is not itself set', () => {
    // AutoMerging is documented to run only as part of the matching job, so this
    // shape should not occur — but the response schema makes both flags
    // independently optional, so the predicate must not depend on the invariant.
    assert.deepStrictEqual(
      evaluateMerging({ Matching: { AutoMerging: { Enabled: true } } }),
      { merging: true, mechanism: 'AutoMerging' },
    );
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: false, AutoMerging: { Enabled: true } },
        RuleBasedMatching: { Enabled: false },
      }),
      { merging: true, mechanism: 'AutoMerging' },
    );
  });

  void it('reports Matching (not AutoMerging) when the documented shape has both', () => {
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: true, AutoMerging: { Enabled: true } },
      }),
      { merging: true, mechanism: 'Matching' },
    );
  });

  void it('allows a domain whose AutoMerging block is present but disabled', () => {
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: false, AutoMerging: { Enabled: false } },
        RuleBasedMatching: { Enabled: false },
      }),
      { merging: false },
    );
  });

  void it('refuses rule-based matching that is still PENDING', () => {
    // Enabling rule-based matching reports PENDING immediately and only becomes
    // ACTIVE up to ~an hour later. PENDING already means the customer asked for
    // merging, so the guard must refuse it rather than wait for ACTIVE.
    assert.deepStrictEqual(
      evaluateMerging({
        Matching: { Enabled: false },
        RuleBasedMatching: { Enabled: true, Status: 'PENDING' },
      }),
      { merging: true, mechanism: 'RuleBasedMatching', status: 'PENDING' },
    );
  });

  void it('refuses rule-based matching in every non-terminal / terminal status', () => {
    for (const Status of ['PENDING', 'IN_PROGRESS', 'ACTIVE']) {
      assert.deepStrictEqual(
        evaluateMerging({ RuleBasedMatching: { Enabled: true, Status } }),
        { merging: true, mechanism: 'RuleBasedMatching', status: Status },
        `expected status ${Status} to be refused`,
      );
    }
  });

  void it('refuses rule-based matching with no status reported', () => {
    assert.deepStrictEqual(
      evaluateMerging({ RuleBasedMatching: { Enabled: true } }),
      { merging: true, mechanism: 'RuleBasedMatching' },
    );
  });

  void it('reports ML matching first when BOTH mechanisms are enabled', () => {
    const verdict = evaluateMerging({
      Matching: { Enabled: true },
      RuleBasedMatching: { Enabled: true, Status: 'ACTIVE' },
    });
    assert.strictEqual(verdict.merging, true);
    assert.strictEqual(
      (verdict as { mechanism: string }).mechanism,
      'Matching',
    );
  });

  void it('treats a truthy-but-not-true Enabled as disabled (strict boolean check)', () => {
    // GetDomain returns a real boolean; anything else is malformed and must not
    // be coerced into a refusal (or, worse, into a pass for `false`-y strings).
    const malformed = {
      Matching: { Enabled: 'true' },
    } as unknown as DomainMatchingView;
    assert.deepStrictEqual(evaluateMerging(malformed), { merging: false });
  });
});

void describe('mergingEnabledMessage', () => {
  void it('names the domain, the mechanism and the remediation', () => {
    const message = mergingEnabledMessage('my-domain', {
      merging: true,
      mechanism: 'RuleBasedMatching',
      status: 'PENDING',
    });
    assert.match(message, /Identity Resolution disabled/);
    assert.match(message, /'my-domain'/);
    assert.match(message, /RuleBasedMatching enabled \(status PENDING\)/);
    assert.match(message, /Attach a dedicated non-merging domain/);
  });

  void it('omits the status clause when no status is reported', () => {
    const message = mergingEnabledMessage('d', {
      merging: true,
      mechanism: 'Matching',
    });
    assert.match(message, /has Matching enabled\./);
    assert.doesNotMatch(message, /status/);
  });
});

void describe('isRetriableGetDomainError', () => {
  void it('retries AccessDeniedException (the guard policy is written in the same changeset)', () => {
    // Observed end-to-end during an UPDATE_ROLLBACK of a domainName change: the
    // inline policy was being restored to the previous domain while the guard was
    // re-invoked for it, so IAM denied an authorized call for ~seconds. Failing
    // there wedges the stack in UPDATE_ROLLBACK_FAILED.
    assert.strictEqual(
      isRetriableGetDomainError({ name: 'AccessDeniedException' }),
      true,
    );
  });

  void it('retries throttling and 5xx service faults', () => {
    for (const name of [
      'ThrottlingException',
      'TooManyRequestsException',
      'InternalServerException',
      'ServiceUnavailableException',
      'TimeoutError',
    ]) {
      assert.strictEqual(
        isRetriableGetDomainError({ name }),
        true,
        `${name} should be retriable`,
      );
    }
    assert.strictEqual(
      isRetriableGetDomainError({
        name: 'Whatever',
        $metadata: { httpStatusCode: 503 },
      }),
      true,
    );
  });

  void it('does NOT retry a genuinely absent or malformed domain', () => {
    for (const name of [
      'ResourceNotFoundException',
      'BadRequestException',
      'ValidationException',
    ]) {
      assert.strictEqual(
        isRetriableGetDomainError({ name }),
        false,
        `${name} must fail fast`,
      );
    }
    assert.strictEqual(
      isRetriableGetDomainError({
        name: 'ResourceNotFoundException',
        $metadata: { httpStatusCode: 404 },
      }),
      false,
    );
  });

  void it('does not throw on malformed / empty error values', () => {
    assert.strictEqual(isRetriableGetDomainError(undefined), false);
    assert.strictEqual(isRetriableGetDomainError(null), false);
    assert.strictEqual(isRetriableGetDomainError('boom'), false);
    assert.strictEqual(isRetriableGetDomainError({}), false);
  });
});
