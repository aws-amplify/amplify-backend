import { describe, it } from 'node:test';
import { translateErrorToTelemetryErrorDetails } from './translate_error_to_telemetry_error_details';
import assert from 'node:assert';
import { TelemetryPayload } from './telemetry_payload';

void describe('translateErrorToTelemetryErrorDetails', () => {
  void it('returns error details', () => {
    const error = new Error('test error message');
    error.stack = 'test stack';
    const expectedError: TelemetryPayload['error'] = {
      name: 'Error',
    };
    const actual = translateErrorToTelemetryErrorDetails(error);
    assert.deepStrictEqual(actual, expectedError);
  });

  void it('returns error details for errors with deeply nested causes', () => {
    const deeplyNestedError = new Error('deeply nested error');
    deeplyNestedError.name = 'DeeplyNestedError';
    deeplyNestedError.stack = 'stack for deeply nested error';
    const nestedError = new Error('nested error');
    nestedError.name = 'NestedError';
    nestedError.cause = deeplyNestedError;
    nestedError.stack = 'stack for nested error';
    const error = new Error('top level error');
    error.cause = nestedError;
    error.stack = 'stack for error';

    const expectedError: TelemetryPayload['error'] = {
      name: 'DeeplyNestedError',
      caused: {
        name: 'NestedError',
        caused: {
          name: 'Error',
        },
      },
    };
    const actual = translateErrorToTelemetryErrorDetails(error);
    assert.deepStrictEqual(actual, expectedError);
  });

  void it('returns undefined if there is no error', () => {
    const actual = translateErrorToTelemetryErrorDetails();
    assert.strictEqual(actual, undefined);
  });
});
