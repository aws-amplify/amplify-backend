import { TelemetryPayloadKeys } from './telemetry_payload';
import { AttributeValue, Span } from '@opentelemetry/api';

/**
 * Flatten object and set span attributes for telemetry
 */
export const setSpanAttributesFromObject = (
  span: Span,
  prefix: TelemetryPayloadKeys,
  // This is to allow any shape of object (with n number of nested objects) to be passed in
  // types of values are narrowed and later parsed with telemetry zod schema
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  obj: Record<string, any>,
) => {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    const fullKey = `${prefix}.${key}`;

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      setSpanAttributesFromObject(span, fullKey as TelemetryPayloadKeys, value);
    } else if (isAttributeValue(value)) {
      span.setAttribute(fullKey, value);
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
