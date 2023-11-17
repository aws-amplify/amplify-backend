import { ConfigController, TELEMETRY_ENABLED_KEY } from '../index.js';
import { NoOpUsageDataEmitter } from './noop_usage_data_emitter.js';
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
    const configController = new ConfigController();

    if (
      process.env.AMPLIFY_DISABLE_TELEMETRY ||
      configController.get<boolean>(TELEMETRY_ENABLED_KEY) === false
    ) {
      return new NoOpUsageDataEmitter();
    }

    return new DefaultUsageDataEmitter(libraryVersion);
  };
}
