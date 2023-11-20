import assert from 'node:assert';
import { beforeEach, describe, it, mock } from 'node:test';

import { UsageDataEmitterFactory } from './usage_data_emitter_factory';
import { DefaultUsageDataEmitter } from './usage_data_emitter';
import { NoOpUsageDataEmitter } from './noop_usage_data_emitter';
import {
  ConfigurationController,
  configControllerFactory,
} from '../config/local_configuration_controller_factory';

void describe('UsageDataEmitterFactory', () => {
  const configControllerGet = mock.fn();
  const mockedConfigController: ConfigurationController = {
    get: configControllerGet,
  } as unknown as ConfigurationController;

  mock.method(
    configControllerFactory,
    'getInstance',
    () => mockedConfigController
  );

  beforeEach(() => {
    configControllerGet.mock.resetCalls();
  });

  void it('returns DefaultUsageDataEmitter by default', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    const dataEmitter = await new UsageDataEmitterFactory().getInstance(
      '0.0.0'
    );
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(dataEmitter instanceof DefaultUsageDataEmitter, true);
  });

  void it('returns NoOpUsageDataEmitter if AMPLIFY_DISABLE_TELEMETRY env var is set', async () => {
    configControllerGet.mock.mockImplementationOnce(() => undefined);
    process.env['AMPLIFY_DISABLE_TELEMETRY'] = '1';
    const dataEmitter = await new UsageDataEmitterFactory().getInstance(
      '0.0.0'
    );
    assert.strictEqual(dataEmitter instanceof NoOpUsageDataEmitter, true);
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
  });

  void it('returns NoOpUsageDataEmitter if local config file exists and reads true', async () => {
    configControllerGet.mock.mockImplementationOnce(() => false);
    const dataEmitter = await new UsageDataEmitterFactory().getInstance(
      '0.0.0'
    );
    assert.strictEqual(configControllerGet.mock.callCount(), 1);
    assert.strictEqual(dataEmitter instanceof NoOpUsageDataEmitter, true);
  });
});
