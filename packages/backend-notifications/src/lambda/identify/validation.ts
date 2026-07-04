import { ChannelType, IdentifyUserRequest, OptOut } from './types.js';

const CHANNEL_TYPES: ReadonlyArray<ChannelType> = [
  'GCM',
  'APNS',
  'APNS_SANDBOX',
  'IN_APP',
];
const OPT_OUTS: ReadonlyArray<OptOut> = ['ALL', 'NONE'];

export type ValidationResult = {
  ok: boolean;
  error?: string;
  value?: IdentifyUserRequest;
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

const isStringMap = (v: unknown): v is Record<string, string[]> =>
  isPlainObject(v) && Object.values(v).every((x) => isStringArray(x));

/**
 * Validate the frozen identify-user request contract.
 *
 * Returns `{ ok: false, error }` on the first violation so the handler can map
 * it to a 400. Identity is NOT validated here — the verified `sub` is supplied
 * separately by the authorizer.
 */
export const validateBody = (body: unknown): ValidationResult => {
  if (!isPlainObject(body)) {
    return { ok: false, error: 'Request body must be a JSON object' };
  }

  if (body.userId !== undefined && typeof body.userId !== 'string') {
    return { ok: false, error: 'userId must be a string when present' };
  }

  const userProfile = body.userProfile;
  if (!isPlainObject(userProfile)) {
    return {
      ok: false,
      error: 'userProfile is required and must be an object',
    };
  }

  for (const key of ['name', 'email', 'plan'] as const) {
    if (
      userProfile[key] !== undefined &&
      typeof userProfile[key] !== 'string'
    ) {
      return { ok: false, error: `userProfile.${key} must be a string` };
    }
  }

  if (
    userProfile.customProperties !== undefined &&
    !isStringMap(userProfile.customProperties)
  ) {
    return {
      ok: false,
      error: 'userProfile.customProperties must be a map of string arrays',
    };
  }

  if (userProfile.metrics !== undefined) {
    if (
      !isPlainObject(userProfile.metrics) ||
      !Object.values(userProfile.metrics).every((n) => typeof n === 'number')
    ) {
      return {
        ok: false,
        error: 'userProfile.metrics must be a map of numbers',
      };
    }
  }

  const options = body.options;
  if (options !== undefined) {
    if (!isPlainObject(options)) {
      return { ok: false, error: 'options must be an object when present' };
    }
    if (options.address !== undefined && typeof options.address !== 'string') {
      return { ok: false, error: 'options.address must be a string' };
    }
    if (
      options.deviceId !== undefined &&
      typeof options.deviceId !== 'string'
    ) {
      return { ok: false, error: 'options.deviceId must be a string' };
    }
    if (
      options.previousGuestIdentityId !== undefined &&
      typeof options.previousGuestIdentityId !== 'string'
    ) {
      return {
        ok: false,
        error: 'options.previousGuestIdentityId must be a string',
      };
    }
    if (
      options.channelType !== undefined &&
      !CHANNEL_TYPES.includes(options.channelType as ChannelType)
    ) {
      return {
        ok: false,
        error: `options.channelType must be one of ${CHANNEL_TYPES.join(', ')}`,
      };
    }
    if (
      options.optOut !== undefined &&
      !OPT_OUTS.includes(options.optOut as OptOut)
    ) {
      return {
        ok: false,
        error: `options.optOut must be one of ${OPT_OUTS.join(', ')}`,
      };
    }
    if (
      options.userAttributes !== undefined &&
      !isStringMap(options.userAttributes)
    ) {
      return {
        ok: false,
        error: 'options.userAttributes must be a map of string arrays',
      };
    }
  }

  return { ok: true, value: body as unknown as IdentifyUserRequest };
};
