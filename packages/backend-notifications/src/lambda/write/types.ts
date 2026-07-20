/**
 * Frozen request/response contract for the notifications write backend.
 *
 * Three SigV4 routes share ONE Lambda:
 *   - POST /identify-user   : { userProfile }
 *   - POST /register-device : { device: { token, deviceId, platform?, appVersion?, channelType } }
 *   - POST /remove-device   : { deviceId }
 *
 * `principalId` is ALWAYS server-derived from the SigV4/IAM request context and
 * is NEVER accepted on the wire.
 */

/** Channel types eligible for push delivery. */
export type ChannelType = 'GCM' | 'APNS' | 'APNS_SANDBOX';

export const KNOWN_CHANNEL_TYPES: ChannelType[] = [
  'APNS',
  'APNS_SANDBOX',
  'GCM',
];

/** Customer-supplied location (mapped to a Customer Profiles Address). */
export type Location = {
  city?: string;
  country?: string;
  postalCode?: string;
  /** Provider-agnostic admin area; mapped to Customer Profiles Address.Province. */
  region?: string;
};

/** Customer-controlled profile / targeting attributes. */
export type UserProfile = {
  email?: string;
  name?: string;
  phone?: string;
  customAttributes?: Record<string, string>;
  location?: Location;
};

/** SDK-enriched device entity for POST /register-device. */
export type DeviceRegistration = {
  token: string;
  deviceId: string;
  platform?: string;
  appVersion?: string;
  channelType: ChannelType;
};

export type IdentifyUserRequest = {
  userProfile: UserProfile;
};

export type RegisterDeviceRequest = {
  device: DeviceRegistration;
};

export type RemoveDeviceRequest = {
  deviceId: string;
};

export type SuccessResponse = Record<string, never>;

export type ErrorResponse = {
  message: string;
};

/** The three write routes served by the single Lambda. */
export type WriteRoute = 'identify-user' | 'register-device' | 'remove-device';
