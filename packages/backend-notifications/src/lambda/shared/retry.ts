// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * True for retriable Customer Profiles errors: throttling
 * (ThrottlingException / TooManyRequestsException) and the idempotent
 * concurrent-write serialization BadRequestException. All other errors are
 * caller errors that must NOT be retried.
 */
export const isRetriableError = (err: unknown): boolean => {
  const name = (err as { name?: string })?.name ?? '';
  const msg = (err as { message?: string })?.message ?? '';
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
      if (!isRetriableError(err) || i === attempts - 1) {
        throw err;
      }
      const ceiling = baseDelayMs * 2 ** i;
      await sleep(Math.floor(Math.random() * ceiling));
    }
  }
  throw lastErr;
};
