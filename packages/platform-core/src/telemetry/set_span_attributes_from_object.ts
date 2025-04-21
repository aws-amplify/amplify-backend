import { DeepPartial } from '@aws-amplify/plugin-types';
import { AttributeValue, Span } from '@opentelemetry/api';
import { ErrorDetails, TelemetryPayload } from './telemetry_payload';

/**
 * Flatten object to dot notation and set span attributes for telemetry
 */
export const setSpanAttributesFromObject = (
  span: Span,
  obj: DeepPartial<TelemetryPayload> | ErrorDetails,
  prefix: string = '',
): void => {
  if (obj && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) {
        continue;
      }
      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (isAttributeValue(value)) {
        span.setAttribute(fullKey, value);
      } else if (typeof value === 'object') {
        setSpanAttributesFromObject(span, value, fullKey);
      }
    }
  }
};

const isAttributeValue = (value: unknown): value is AttributeValue => {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    (Array.isArray(value) &&
      value.every(
        (val) =>
          typeof val === 'string' ||
          typeof val === 'number' ||
          typeof val === 'boolean',
      ))
  );
};
