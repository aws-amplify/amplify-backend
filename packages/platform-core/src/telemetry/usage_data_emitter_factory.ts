import { DeploymentTimes } from './usage_data';
import { DefaultUsageDataEmitter } from './usage_data_emitter.js';

export type UsageDataEmitter = {
  emitSuccess: (
    command: string,
    deploymentTimes?: DeploymentTimes,
    hotswapped?: boolean
  ) => Promise<void>;
  emitFailure: (command: string, error: Error) => Promise<void>;
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
