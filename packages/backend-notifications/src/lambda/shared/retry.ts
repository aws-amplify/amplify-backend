// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Customer Profiles serializes writes to a single profile: concurrent
 * UpdateProfile / PutProfileObject calls against the same profile fail with a
 * `BadRequestException: Failed to update profile due to concurrent update
 * in-progress.` This is a TRANSIENT, idempotent condition (the write is safe to
 * repeat), so the correct handling is a short bounded retry with jittered
 * backoff rather than surfacing a 5xx to the caller.
 */
export const isTransientConcurrentUpdate = (err: unknown): boolean => {
  const name = (err as { name?: string })?.name ?? '';
  const msg = (err as { message?: string })?.message ?? '';
  // Throttling is always transient. A BadRequestException is retryable ONLY
  // when it is the Customer Profiles concurrent-write serialization error (the
  // write is idempotent and safe to repeat); every other BadRequestException is
  // a caller error that must NOT be retried.
  if (name === 'ThrottlingException' || name === 'TooManyRequestsException') {
    return true;
  }
  return (
    name === 'BadRequestException' && /concurrent update in-progress/i.test(msg)
  );
};

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Run `fn`, retrying on transient concurrent-update / throttling errors with
 * exponential backoff + full jitter. Non-transient errors propagate immediately.
 */
export const withTransientRetry = async <T>(
  fn: () => Promise<T>,
  opts: { attempts?: number; baseDelayMs?: number } = {},
): Promise<T> => {
  const attempts = opts.attempts ?? 6;
  const baseDelayMs = opts.baseDelayMs ?? 80;
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransientConcurrentUpdate(err) || i === attempts - 1) {
        throw err;
      }
      const ceiling = baseDelayMs * 2 ** i;
      await sleep(Math.floor(Math.random() * ceiling));
    }
  }
  throw lastErr;
};
