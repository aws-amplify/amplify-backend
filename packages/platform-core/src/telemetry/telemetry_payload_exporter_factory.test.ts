import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { TelemetryPayloadExporterFactory } from './telemetry_payload_exporter_factory';
import assert from 'node:assert';
import { NoOpTelemetryPayloadExporter } from './noop_telemetry_payload_exporter';
import {
  ConfigurationController,
  configControllerFactory,
} from '../config/local_configuration_controller_factory';
import { DefaultTelemetryPayloadExporter } from './telemetry_payload_exporter';

void describe('TelemetryPayloadExporterFactory', () => {
  const configControllerGet = mock.fn((value?: boolean) => value);
  const mockedConfigController: ConfigurationController = {
    get: configControllerGet,
  } as unknown as ConfigurationController;

  mock.method(
    configControllerFactory,
    'getInstance',
    () => mockedConfigController,
  );

  const originalAmplifyDisableTelemetry =
    process.env['AMPLIFY_DISABLE_TELEMETRY'];

  before(() => {
    // Unset AMPLIFY_DISABLE_TELEMETRY. We may be setting this variable in GitHub workflows.
    delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
  });

  after(() => {
    // Restore original value after tests.
    process.env['AMPLIFY_DISABLE_TELEMETRY'] = originalAmplifyDisableTelemetry;
  });

  beforeEach(() => {
    configControllerGet.mock.resetCalls();
  });

  void it('returns DefaultTelemetryPayloadExporter by default', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    const telemetryPayloadExporter =
      await new TelemetryPayloadExporterFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetryPayloadExporter instanceof DefaultTelemetryPayloadExporter,
      true,
    );
  });

  void it('returns NoOpTelemetryPayloadExporter if AMPLIFY_DISABLE_TELEMETRY env var is set', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    process.env['AMPLIFY_DISABLE_TELEMETRY'] = '1';
    const telemetryPayloadExporter =
      await new TelemetryPayloadExporterFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetryPayloadExporter instanceof NoOpTelemetryPayloadExporter,
      true,
    );
    delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
  });

  void it('returns NoOpTelemetryPayloadExporter if local config file exists and reads true', async () => {
    configControllerGet.mock.mockImplementationOnce(() => false);
    const telemetryPayloadExporter =
      await new TelemetryPayloadExporterFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetryPayloadExporter instanceof NoOpTelemetryPayloadExporter,
      true,
    );
  });
});
