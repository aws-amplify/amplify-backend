import { UsageDataEmitter } from './usage_data_emitter_factory';

/**
 * class implementing UsageDataEmitter that does not emit any data.
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
  emitFailure(_: Error): Promise<void> {
    return Promise.resolve();
  }
}
