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
 * - More than one value -> JSON.stringify of the array (preserves all values).
 * The result is truncated to {@link MAX_ATTRIBUTE_LENGTH} characters.
 */
export const flatten = (values: string[]): string => {
  let out: string;
  if (!values || values.length === 0) {
    out = '';
  } else if (values.length === 1) {
    out = values[0] ?? '';
  } else {
    out = JSON.stringify(values);
  }
  return out.length > MAX_ATTRIBUTE_LENGTH
    ? out.slice(0, MAX_ATTRIBUTE_LENGTH)
    : out;
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
  return out.length > MAX_ATTRIBUTE_LENGTH
    ? out.slice(0, MAX_ATTRIBUTE_LENGTH)
    : out;
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

/**
 * Build the `_source.*` payload for the AmplifyDevice object type.
 *
 * Keyed UNIQUELY by the stable `deviceId`; `deviceToken` (options.address) is a
 * mutable field so token refreshes upsert the same object in place. Carries the
 * verified identity field (`cognitoSub` for authed, `cognitoIdentityId` for
 * guest) as the PROFILE-resolution key so the device merges into the profile
 * bound to that {@link Principal}.
 *
 * `platform` / `appVersion` come from the options, falling back to the
 * `userProfile.demographic` equivalents. `updatedAt` is server-set on every
 * write; `createdAt` is the IMMUTABLE first-registration time — the caller
 * passes the value read back from the existing device object (if any) so it is
 * preserved across PutProfileObject replacements, otherwise it defaults to now.
 */
export const buildDeviceObject = (
  principal: Principal,
  req: IdentifyUserRequest,
  existingCreatedAt?: string,
): Record<string, string> => {
  const options = req.options ?? {};
  const demographic = req.userProfile?.demographic;
  const platform = options.platform ?? demographic?.platform;
  const appVersion = options.appVersion ?? demographic?.appVersion;
  const now = new Date().toISOString();

  return compact({
    [principal.objectField]: principal.value,
    deviceId: options.deviceId,
    deviceToken: options.address,
    channelType: options.channelType,
    platform,
    appVersion,
    createdAt: existingCreatedAt ?? now,
    updatedAt: now,
  }) as Record<string, string>;
};
