import { MAX_ATTRIBUTE_LENGTH } from '../../constants.js';
import { RESERVED_ATTRIBUTE_KEYS } from '../../object_types.js';
import {
  ChannelType,
  DeviceRegistration,
  IdentifyUserRequest,
  KNOWN_CHANNEL_TYPES,
  RegisterDeviceRequest,
  RemoveDeviceRequest,
  UserProfile,
} from './types.js';

/**
 * Result of a per-route validator. `ok:true` carries the narrowed value; a
 * failure carries a PII-safe `error` message surfaced to the caller as
 * 400 { message }.
 */
export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isBoundedString = (v: unknown): v is string =>
  typeof v === 'string' && v.length <= MAX_ATTRIBUTE_LENGTH;

const isNonEmptyBoundedString = (v: unknown): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= MAX_ATTRIBUTE_LENGTH;

const validateLocation = (loc: unknown): string | undefined => {
  if (!isPlainObject(loc)) {
    return 'userProfile.location must be an object';
  }
  for (const key of ['city', 'country', 'postalCode', 'region'] as const) {
    const value = (loc as Record<string, unknown>)[key];
    if (value !== undefined && !isBoundedString(value)) {
      return `userProfile.location.${key} must be a string <= ${MAX_ATTRIBUTE_LENGTH} chars`;
    }
  }
  return undefined;
};

/** Validate POST /identify-user: { userProfile }. */
export const validateIdentifyUser = (
  body: unknown,
): ValidationResult<IdentifyUserRequest> => {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const userProfile = body.userProfile;
  if (!isPlainObject(userProfile)) {
    return {
      ok: false,
      error: 'userProfile is required and must be an object',
    };
  }

  for (const key of ['email', 'name', 'phone'] as const) {
    const value = (userProfile as Record<string, unknown>)[key];
    if (value !== undefined && !isBoundedString(value)) {
      return {
        ok: false,
        error: `userProfile.${key} must be a string <= ${MAX_ATTRIBUTE_LENGTH} chars`,
      };
    }
  }

  if (userProfile.location !== undefined) {
    const err = validateLocation(userProfile.location);
    if (err) {
      return { ok: false, error: err };
    }
  }

  if (userProfile.customAttributes !== undefined) {
    if (!isPlainObject(userProfile.customAttributes)) {
      return {
        ok: false,
        error: 'userProfile.customAttributes must be a map of strings',
      };
    }
    for (const [key, value] of Object.entries(userProfile.customAttributes)) {
      if (RESERVED_ATTRIBUTE_KEYS.has(key)) {
        return {
          ok: false,
          error: `userProfile.customAttributes may not contain reserved key "${key}"`,
        };
      }
      if (key.length > MAX_ATTRIBUTE_LENGTH || !isBoundedString(value)) {
        return {
          ok: false,
          error: `userProfile.customAttributes entries must be strings <= ${MAX_ATTRIBUTE_LENGTH} chars`,
        };
      }
    }
  }

  return {
    ok: true,
    value: {
      userProfile: userProfile as UserProfile,
    },
  };
};

/** Validate POST /register-device: { device: { token, deviceId, ... } }. */
export const validateRegisterDevice = (
  body: unknown,
): ValidationResult<RegisterDeviceRequest> => {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  const device = body.device;
  if (!isPlainObject(device)) {
    return { ok: false, error: 'device is required and must be an object' };
  }

  if (!isNonEmptyBoundedString(device.token)) {
    return {
      ok: false,
      error: `device.token is required and must be a non-empty string <= ${MAX_ATTRIBUTE_LENGTH} chars`,
    };
  }
  if (!isNonEmptyBoundedString(device.deviceId)) {
    return {
      ok: false,
      error: `device.deviceId is required and must be a non-empty string <= ${MAX_ATTRIBUTE_LENGTH} chars`,
    };
  }
  if (!KNOWN_CHANNEL_TYPES.includes(device.channelType as ChannelType)) {
    return {
      ok: false,
      error: `device.channelType must be one of ${KNOWN_CHANNEL_TYPES.join(', ')}`,
    };
  }
  for (const key of ['platform', 'appVersion'] as const) {
    const value = (device as Record<string, unknown>)[key];
    if (value !== undefined && !isBoundedString(value)) {
      return {
        ok: false,
        error: `device.${key} must be a string <= ${MAX_ATTRIBUTE_LENGTH} chars`,
      };
    }
  }

  return {
    ok: true,
    value: { device: device as unknown as DeviceRegistration },
  };
};

/** Validate POST /remove-device: { deviceId }. */
export const validateRemoveDevice = (
  body: unknown,
): ValidationResult<RemoveDeviceRequest> => {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }
  if (!isNonEmptyBoundedString(body.deviceId)) {
    return {
      ok: false,
      error: `deviceId is required and must be a non-empty string <= ${MAX_ATTRIBUTE_LENGTH} chars`,
    };
  }
  return { ok: true, value: { deviceId: body.deviceId } };
};
