import { ChannelType, IdentifyUserRequest } from './types.js';
import { MAX_ATTRIBUTE_LENGTH } from '../../constants.js';
import { Principal } from './principal.js';

/** A standard Customer Profiles address (subset used by this backend). */
export type ProfileAddress = {
  city?: string;
  country?: string;
  postalCode?: string;
  province?: string;
};

/** Person data mapped to UpdateProfile standard fields + Attributes map. */
export type ProfileUpdate = {
  emailAddress?: string;
  firstName?: string;
  lastName?: string;
  address?: ProfileAddress;
  attributes: Record<string, string>;
};

/**
 * Flatten a multi-value attribute into a single string that fits within the
 * Customer Profiles attribute-value limit.
 *
 * - Zero values -> empty string.
 * - Exactly one value -> that element verbatim.
 * - More than one value -> JSON.stringify of the array when it fits, else the
 *   first value. Never slices a serialized JSON string (that would store
 *   invalid JSON that cannot be deserialized).
 */
export const flatten = (values: string[]): string => {
  if (!values || values.length === 0) {
    return '';
  }
  if (values.length === 1) {
    return (values[0] ?? '').slice(0, MAX_ATTRIBUTE_LENGTH);
  }
  const candidate = JSON.stringify(values);
  return candidate.length <= MAX_ATTRIBUTE_LENGTH
    ? candidate
    : (values[0] ?? '').slice(0, MAX_ATTRIBUTE_LENGTH);
};

/**
 * Serialize a map of multi-value attributes into a single JSON string.
 *
 * Customer Profiles requires statically declared field mappings, so dynamic key
 * spaces (customProperties / userAttributes) are collapsed into one JSON
 * attribute. Each value is flattened per the single-string rule first.
 */
const serializeMultiValueMap = (
  map: Record<string, string[]> | undefined,
): string | undefined => {
  if (!map) {
    return undefined;
  }
  const keys = Object.keys(map);
  if (keys.length === 0) {
    return undefined;
  }
  const flattened: Record<string, string> = {};
  for (const key of keys) {
    flattened[key] = flatten(map[key]);
  }
  const out = JSON.stringify(flattened);
  return out.length <= MAX_ATTRIBUTE_LENGTH ? out : undefined;
};

const splitName = (name: string): { firstName: string; lastName?: string } => {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(' ');
  if (idx === -1) {
    return { firstName: trimmed };
  }
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim() || undefined,
  };
};

/** Drop keys whose value is undefined/null/empty. */
const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k] = v;
    }
  }
  return out as Partial<T>;
};

/** Which promoted targeting attribute a channel type activates. */
export const targetingFlagsForChannel = (
  channelType: ChannelType | undefined,
): { hasGCM?: string; hasAPNS?: string } => {
  switch (channelType) {
    case 'GCM':
      return { hasGCM: 'true' };
    case 'APNS':
    case 'APNS_SANDBOX':
      return { hasAPNS: 'true' };
    default:
      return {};
  }
};

/** True when the request carries enough data to register/update a device. */
export const hasDeviceData = (req: IdentifyUserRequest): boolean =>
  !!req.options?.deviceId;

/**
 * Build the UpdateProfile payload (standard fields + Attributes map) for the
 * profile identified by the verified {@link Principal} (authed `sub` or guest
 * `cognitoIdentityId`).
 *
 * SECURITY: `principal.value` comes from an authorizer-verified source (JWT
 * claims or the IAM/Cognito identity). The client-supplied `userId` is stored
 * only as the `appUserId` attribute — never the identity.
 */
export const buildProfileUpdate = (
  principal: Principal,
  req: IdentifyUserRequest,
): ProfileUpdate => {
  const profile = req.userProfile ?? {};
  const demographic = profile.demographic;
  const location = profile.location;
  const name = profile.name ? splitName(profile.name) : undefined;
  const flags = targetingFlagsForChannel(req.options?.channelType);

  const attributes = compact({
    // Identity trail (searchable key is separate; this is for reference only).
    [principal.keyName]: principal.value,
    appUserId: req.userId,

    // Targeting / custom attributes for Connect segmentation.
    plan: profile.plan,
    locale: demographic?.locale,
    platform: demographic?.platform,
    appVersion: demographic?.appVersion,
    make: demographic?.make,
    model: demographic?.model,
    modelVersion: demographic?.modelVersion,
    platformVersion: demographic?.platformVersion,
    timezone: demographic?.timezone,
    latitude:
      location?.latitude !== undefined ? String(location.latitude) : undefined,
    longitude:
      location?.longitude !== undefined
        ? String(location.longitude)
        : undefined,
    customProperties: serializeMultiValueMap(profile.customProperties),
    userAttributes: serializeMultiValueMap(req.options?.userAttributes),
    metrics: profile.metrics ? JSON.stringify(profile.metrics) : undefined,

    // Promoted push-capability flags.
    hasGCM: flags.hasGCM,
    hasAPNS: flags.hasAPNS,
  }) as Record<string, string>;

  const address = compact({
    city: location?.city,
    country: location?.country,
    postalCode: location?.postalCode,
    province: location?.region,
  }) as ProfileAddress;

  return {
    emailAddress: profile.email,
    firstName: name?.firstName,
    lastName: name?.lastName,
    address: Object.keys(address).length > 0 ? address : undefined,
    attributes,
  };
};
