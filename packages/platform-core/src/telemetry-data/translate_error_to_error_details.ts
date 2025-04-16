import { SerializableError } from './serializable_error';
import { TelemetryPayload } from './telemetry_payload';

/**
 * Translates an error into the shape of error details for telemetry
 */
export const translateErrorToErrorDetails = (
  error?: Error,
): TelemetryPayload['error'] => {
  if (!error) {
    return undefined;
  }
  let currentError: Error | undefined = error;
  let errorDetails: TelemetryPayload['error'];

  try {
    while (currentError) {
      const serializedError = new SerializableError(currentError);
      const errorDetail: TelemetryPayload['error'] = {
        name: serializedError.name,
        message: serializedError.message,
        stack: serializedError.stack ?? '',
      };

      if (errorDetails) {
        // this reverses the nesting so lowest level error is the top level error in our telemetry
        errorDetail.cause = errorDetails;
      }

      errorDetails = errorDetail;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      currentError = (currentError as any).cause;
    }
  } catch {
    // Don't propogate errors related to not being able to translate to error data, return what was collected
    return errorDetails;
  }

  return errorDetails;
};
