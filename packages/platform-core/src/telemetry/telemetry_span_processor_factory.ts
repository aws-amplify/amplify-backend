import { Dependency } from '@aws-amplify/plugin-types';
import {
  NoopSpanProcessor,
  SimpleSpanProcessor,
  SpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { configControllerFactory } from '../config/local_configuration_controller_factory';
import { TELEMETRY_ENABLED } from './constants';
import { DefaultTelemetryPayloadExporter } from './telemetry_payload_exporter';

/**
 * Creates TelemetrySpanProcessorFactory
 */
export class TelemetrySpanProcessorFactory {
  getInstance = async (
    dependencies?: Array<Dependency>,
  ): Promise<SpanProcessor> => {
    const configController = configControllerFactory.getInstance(
      'usage_data_preferences.json',
    );

    const telemetryTrackingDisabledLocalFile =
      (await configController.get<boolean>(TELEMETRY_ENABLED)) === false;

    if (
      process.env.AMPLIFY_DISABLE_TELEMETRY ||
      telemetryTrackingDisabledLocalFile
    ) {
      return new NoopSpanProcessor();
    }
    return new SimpleSpanProcessor(
      new DefaultTelemetryPayloadExporter(dependencies),
    );
  };
}
