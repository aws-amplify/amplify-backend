import { TelemetryDataEmitter } from "./telemetry_data_emitter_factory";

/**
 * no-op class that implements TelemetryDataEmitter
 */
export class NoOpTelemetryDataEmitter implements TelemetryDataEmitter {
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
  emitFailure(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * no-op emitAbortion
   */
  emitAbortion(): Promise<void> {
    return Promise.resolve();
  }
}