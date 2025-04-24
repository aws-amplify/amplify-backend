import { after, before, beforeEach, describe, it, mock } from 'node:test';
import { TelemetrySpanProcessorFactory } from './telemetry_span_processor_factory';
import assert from 'node:assert';
import {
  ConfigurationController,
  configControllerFactory,
} from '../config/local_configuration_controller_factory';
import {
  NoopSpanProcessor,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';

void describe('TelemetrySpanProcessorFactory', () => {
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

  void it('returns SimpleSpanProcessor by default', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    const telemetrySpanProcessor =
      await new TelemetrySpanProcessorFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetrySpanProcessor instanceof SimpleSpanProcessor,
      true,
    );
  });

  void it('returns NoopSpanProcessor if AMPLIFY_DISABLE_TELEMETRY env var is set', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    process.env['AMPLIFY_DISABLE_TELEMETRY'] = '1';
    const telemetrySpanProcessor =
      await new TelemetrySpanProcessorFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetrySpanProcessor instanceof NoopSpanProcessor,
      true,
    );
    delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
  });

  void it('returns NoopSpanProcessor if local config file exists and reads true', async () => {
    configControllerGet.mock.mockImplementationOnce(() => false);
    const telemetrySpanProcessor =
      await new TelemetrySpanProcessorFactory().getInstance();
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(
      telemetrySpanProcessor instanceof NoopSpanProcessor,
      true,
    );
  });
});
