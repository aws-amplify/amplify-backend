// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * The subset of a Customer Profiles `GetDomain` response this check reads. Kept
 * structural (rather than importing the SDK's `GetDomainResponse`) so the
 * predicate is a pure function over plain data and can be unit-tested with
 * literal fixtures.
 */
/* eslint-disable @typescript-eslint/naming-convention -- Customer Profiles API
   response shapes are PascalCase by contract. */
export type DomainMatchingView = {
  Matching?: { Enabled?: boolean };
  RuleBasedMatching?: { Enabled?: boolean; Status?: string };
};
/* eslint-enable @typescript-eslint/naming-convention */

/** Which Identity Resolution mechanism is enabled on a domain, if any. */
export type MergingVerdict =
  | { merging: false }
  | {
      merging: true;
      /** The enabled mechanism, named as the API field, for the error message. */
      mechanism: 'Matching' | 'RuleBasedMatching';
      /** `RuleBasedMatching.Status`, when present — PENDING counts as enabled. */
      status?: string;
    };

/**
 * Decide whether Identity Resolution (profile merging) is enabled on a Customer
 * Profiles domain.
 *
 * Merging is treated as ENABLED when EITHER mechanism is on:
 *   - `Matching.Enabled` — the ML/batch weekly identity-resolution job.
 *   - `RuleBasedMatching.Enabled` — rule-based (real-time) matching.
 *
 * `RuleBasedMatching.Status` is deliberately NOT used to soften the verdict:
 * enabling rule-based matching reports PENDING immediately and only becomes
 * ACTIVE up to ~an hour later, so PENDING / IN_PROGRESS / ACTIVE all mean "the
 * customer has asked for merging" and are all refused. Only the `Enabled` flag
 * being false (or the whole block being absent) is a pass.
 *
 * Pure and side-effect free: the deploy-time guard handler calls this on a live
 * `GetDomain` response, and the unit tests call it on literal fixtures.
 * @param domain The `GetDomain` response (or any object with the same shape).
 * @returns `{ merging: false }` when the domain is safe to attach to, otherwise
 * the enabled mechanism and its status.
 */
export const evaluateMerging = (domain: DomainMatchingView): MergingVerdict => {
  if (domain.Matching?.Enabled === true) {
    return { merging: true, mechanism: 'Matching' };
  }
  if (domain.RuleBasedMatching?.Enabled === true) {
    const status = domain.RuleBasedMatching.Status;
    return {
      merging: true,
      mechanism: 'RuleBasedMatching',
      ...(status ? { status } : {}),
    };
  }
  return { merging: false };
};

/**
 * True for `GetDomain` failures that are worth retrying inside a single
 * deployment.
 *
 * `AccessDeniedException` is included on purpose. The guard's inline policy
 * grants `profile:GetDomain` on exactly the attached domain, so CloudFormation
 * writes or rewrites that policy in the SAME changeset that invokes the guard —
 * most visibly when the stack is ROLLING BACK a `domainName` change, where the
 * policy is being restored to the previous domain at the same moment the guard
 * is re-invoked for it. IAM's eventual consistency then denies a call that is in
 * fact authorized (observed end-to-end: three denials over ~1.5s, then success
 * moments later). Failing the deployment on that race would leave the stack in
 * UPDATE_ROLLBACK_FAILED, needing a manual `continue-update-rollback` — so it is
 * retried, and only a denial that outlives the whole backoff budget fails the
 * deploy. Everything else (a real `ResourceNotFoundException`, a malformed
 * request) fails immediately.
 * @param err The error thrown by `GetDomain`.
 * @returns Whether the call should be retried.
 */
export const isRetriableGetDomainError = (err: unknown): boolean => {
  const name = (err as { name?: string })?.name ?? '';
  const status = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
    ?.httpStatusCode;
  return (
    name === 'AccessDeniedException' ||
    name === 'ThrottlingException' ||
    name === 'TooManyRequestsException' ||
    name === 'InternalServerException' ||
    name === 'ServiceUnavailableException' ||
    name === 'TimeoutError' ||
    (typeof status === 'number' && status >= 500)
  );
};

/**
 * The deploy-blocking error message for a domain that has Identity Resolution
 * enabled. Names the domain, the mechanism, and the remediation so the failure
 * is actionable straight from the CloudFormation event stream.
 * @param domainName The Customer Profiles domain that was checked.
 * @param verdict A merging-enabled verdict from {@link evaluateMerging}.
 * @returns The message to fail the deployment with.
 */
export const mergingEnabledMessage = (
  domainName: string,
  verdict: Extract<MergingVerdict, { merging: true }>,
): string => {
  const status = verdict.status ? ` (status ${verdict.status})` : '';
  return (
    `defineNotifications requires a Customer Profiles domain with Identity Resolution disabled; ` +
    `domain '${domainName}' has ${verdict.mechanism} enabled${status}. ` +
    `It relies on a one-to-one mapping between the caller principal and its profile, ` +
    `which profile merging does not preserve because it combines profiles across principals. ` +
    `Attach a dedicated non-merging domain, or disable Identity Resolution on this domain.`
  );
};
