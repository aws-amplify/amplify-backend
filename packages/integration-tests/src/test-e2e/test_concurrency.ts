import os from 'os';

const getConcurrencyLevel = () => {
  if (process.platform.includes('win32')) {
    // TODO use default on Windows until we get better workers.
    return undefined;
  }
  // These tests are I/O bound, so we can be aggressive even on machines without many cores.
  return Math.max(4, os.availableParallelism());
};

/**
 * Defines concurrency level for e2e tests.
 */
export const testConcurrencyLevel = getConcurrencyLevel();
