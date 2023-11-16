import { DefaultUsageDataEmitter } from './usage_data_emitter.js';

export type UsageDataEmitter = {
  emitSuccess: (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>
  ) => Promise<void>;
  emitFailure: (
    error: Error,
    dimensions?: Record<string, string>
  ) => Promise<void>;
};

/**
 * Creates UsageDataEmitter for a given library version
 */
export class UsageDataEmitterFactory {
  /**
   * Returns a ClientConfigGenerator for the given BackendIdentifier type
   */
  getInstance = (libraryVersion: string): UsageDataEmitter => {
    return new DefaultUsageDataEmitter(libraryVersion);
  };
}
