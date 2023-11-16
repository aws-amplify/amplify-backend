import os from 'os';

export const testConcurrencyLevel = Math.min(4, os.availableParallelism());
