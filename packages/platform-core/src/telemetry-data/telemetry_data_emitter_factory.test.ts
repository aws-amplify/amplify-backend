// import assert from 'node:assert';
// import { after, before, beforeEach, describe, it, mock } from 'node:test';
// import {
//   ConfigurationController,
//   configControllerFactory,
// } from '../config/local_configuration_controller_factory';
// import { TelemetryDataEmitterFactory } from './telemetry_data_emitter_factory';
// import { DefaultTelemetryDataEmitter } from './telemetry_data_emitter';
// import { NoOpTelemetryDataEmitter } from './noop_telemetry_data_emitter';

// void describe('TelemetryDataEmitterFactory', () => {
//   const configControllerGet = mock.fn((value?: boolean) => value);
//   const mockedConfigController: ConfigurationController = {
//     get: configControllerGet,
//   } as unknown as ConfigurationController;

//   mock.method(
//     configControllerFactory,
//     'getInstance',
//     () => mockedConfigController
//   );

//   const originalAmplifyDisableTelemetry =
//     process.env['AMPLIFY_DISABLE_TELEMETRY'];

//   before(() => {
//     // Unset AMPLIFY_DISABLE_TELEMETRY. We may be setting this variable in GitHub workflows.
//     delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
//   });

//   after(() => {
//     // Restore original value after tests.
//     process.env['AMPLIFY_DISABLE_TELEMETRY'] = originalAmplifyDisableTelemetry;
//   });

//   beforeEach(() => {
//     configControllerGet.mock.resetCalls();
//   });

//   void it('returns DefaultTelemetryDataEmitter by default', async () => {
//     configControllerGet.mock.mockImplementationOnce(() => undefined);
//     const dataEmitter = await new TelemetryDataEmitterFactory().getInstance(
//       []
//     );
//     assert.strictEqual(configControllerGet.mock.callCount(), 1);
//     assert.strictEqual(dataEmitter instanceof DefaultTelemetryDataEmitter, true);
//   });

//   void it('returns NoOpTelemetryDataEmitter if AMPLIFY_DISABLE_TELEMETRY env var is set', async () => {
//     configControllerGet.mock.mockImplementationOnce(() => undefined);
//     process.env['AMPLIFY_DISABLE_TELEMETRY'] = '1';
//     const dataEmitter = await new TelemetryDataEmitterFactory().getInstance(
//       []
//     );
//     assert.strictEqual(dataEmitter instanceof NoOpTelemetryDataEmitter, true);
//     assert.strictEqual(configControllerGet.mock.callCount(), 1);
//     delete process.env['AMPLIFY_DISABLE_TELEMETRY'];
//   });

//   void it('returns NoOpTelemetryDataEmitter if local config file exists and reads true', async () => {
//     configControllerGet.mock.mockImplementationOnce(() => false);
//     const dataEmitter = await new TelemetryDataEmitterFactory().getInstance(
//       []
//     );
//     assert.strictEqual(configControllerGet.mock.callCount(), 1);
//     assert.strictEqual(dataEmitter instanceof NoOpTelemetryDataEmitter, true);
//   });
// });
