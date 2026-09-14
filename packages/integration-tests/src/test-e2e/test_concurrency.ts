import os from 'os';

/**
 * Defines concurrency level for e2e tests.
 * These tests are I/O bound, so we can be aggressive even on machines without many cores.
 */
export const testConcurrencyLevel = Math.max(4, os.availableParallelism());
