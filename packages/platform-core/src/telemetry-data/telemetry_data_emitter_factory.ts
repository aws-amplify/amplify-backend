import { Dependency } from "@aws-amplify/plugin-types";
import { AmplifyError } from "../errors/amplify_error";
// import { configControllerFactory } from "../config/local_configuration_controller_factory";
// import { USAGE_DATA_TRACKING_ENABLED } from "./constants";
import { DefaultTelemetryDataEmitter } from "./telemetry_data_emitter.js";
// import { NoOpTelemetryDataEmitter } from "./noop_telemetry_data_emitter";

export type TelemetryDataEmitter = {
  emitSuccess: (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => Promise<void>;
  emitFailure: (
    error: AmplifyError,
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => Promise<void>;
  emitAbortion: (
    metrics?: Record<string, number>,
    dimensions?: Record<string, string>,
  ) => Promise<void>;
};

/**
 * Creates TelemetryDataEmitter
 */
export class TelemetryDataEmitterFactory {
  private static instance: TelemetryDataEmitter | undefined;
  /**
   * Creates TelemetryDataEmitter for a given usage data tracking preferences
   */
  getInstance = async (
    dependencies?: Array<Dependency>
  ): Promise<TelemetryDataEmitter> => {
    // const configController = configControllerFactory.getInstance('usage_data_preferences.json');

    // const telemetryDataTrackingDisabledLocalFile = (await configController.get<boolean>(USAGE_DATA_TRACKING_ENABLED)) === false;

    // if (process.env.AMPLIFY_DISABLE_TELEMETRY || telemetryDataTrackingDisabledLocalFile) {
    //   return new NoOpTelemetryDataEmitter();
    // }
    if (!TelemetryDataEmitterFactory.instance) {
      TelemetryDataEmitterFactory.instance = new DefaultTelemetryDataEmitter(dependencies);
    }

    return TelemetryDataEmitterFactory.instance;
  }
}