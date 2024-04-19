import { UsageDataEmitter } from '@aws-amplify/platform-core';

/**
 * Test util to generate UsageDataEmitterFactory with mock functions.
 */
export const getUsageDataEmitterFactoryMock = (
  emitSuccess: UsageDataEmitter['emitSuccess'],
  emitFailure: UsageDataEmitter['emitFailure']
) => {
  return () => Promise.resolve({ emitSuccess, emitFailure });
};
