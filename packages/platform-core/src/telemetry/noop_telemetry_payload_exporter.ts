import { TelemetryPayloadExporter } from './telemetry_payload_exporter_factory';

/**
 * No-op class that implements TelemetryPayloadExporter
 */
export class NoOpTelemetryPayloadExporter implements TelemetryPayloadExporter {
  export = async () => {
    return Promise.resolve();
  };

  shutdown = async () => {
    return Promise.resolve();
  };
}
