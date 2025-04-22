import { Dependency } from '@aws-amplify/plugin-types';
import { ExportResult } from '@opentelemetry/core';
import { ReadableSpan } from '@opentelemetry/sdk-trace-base';
import { configControllerFactory } from '../config/local_configuration_controller_factory';
import { TELEMETRY_TRACKING_ENABLED } from './constants';
import { NoOpTelemetryPayloadExporter } from './noop_telemetry_payload_exporter';
import { DefaultTelemetryPayloadExporter } from './telemetry_payload_exporter';

export type TelemetryPayloadExporter = {
  export: (
    spans: ReadableSpan[],
    resultCallback: (result: ExportResult) => void,
  ) => Promise<void>;
  shutdown: () => Promise<void>;
};

/**
 * Creates TelemetryPayloadExporter
 */
export class TelemetryPayloadExporterFactory {
  getInstance = async (
    dependencies?: Array<Dependency>,
  ): Promise<TelemetryPayloadExporter> => {
    const configController = configControllerFactory.getInstance(
      'usage_data_preferences.json',
    );

    const telemetryTrackingDisabledLocalFile =
      (await configController.get<boolean>(TELEMETRY_TRACKING_ENABLED)) ===
      false;

    if (
      process.env.AMPLIFY_DISABLE_TELEMETRY ||
      telemetryTrackingDisabledLocalFile
    ) {
      return new NoOpTelemetryPayloadExporter();
    }
    return new DefaultTelemetryPayloadExporter(dependencies);
  };
}
