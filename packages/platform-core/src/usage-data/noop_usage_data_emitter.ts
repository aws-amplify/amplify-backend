import { UsageDataEmitter } from './usage_data_emitter_factory';

/**
 * no-op class that implements UsageDataEmitter.
 */
export class NoOpUsageDataEmitter implements UsageDataEmitter {
  /**
   * no-op emitSuccess
   */
  emitSuccess(): Promise<void> {
    // no-op
    return Promise.resolve();
  }

  /**
   * no-op emitFailure
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  emitFailure(): Promise<void> {
    return Promise.resolve();
  }
}
