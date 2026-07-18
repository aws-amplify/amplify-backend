/**
 * Frozen request/response contract for the identify-user backend.
 *
 * These types mirror exactly the JSON shape accepted by
 * `POST {apiEndpoint}/identify-user`. They intentionally live in a single
 * module so the handler, the mapping layer, and the tests share one source of
 * truth.
 */

export type ChannelType = 'GCM' | 'APNS' | 'APNS_SANDBOX' | 'IN_APP';
export type OptOut = 'ALL' | 'NONE';

export type Demographic = {
  appVersion?: string;
  locale?: string;
  make?: string;
  model?: string;
  modelVersion?: string;
  platform?: string;
  platformVersion?: string;
  timezone?: string;
};

export type Location = {
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  postalCode?: string;
  region?: string;
};

export type UserProfile = {
  name?: string;
  email?: string;
  plan?: string;
  customProperties?: Record<string, string[]>;
  demographic?: Demographic;
  location?: Location;
  metrics?: Record<string, number>;
};

export type IdentifyUserOptions = {
  userAttributes?: Record<string, string[]>;
  /** Mutable push token / endpoint address. Stored as a FIELD, not the key. */
  address?: string;
  /**
   * Stable device identifier (e.g. the client-persisted endpointId). This is
   * the partition key of the DynamoDB Devices table, so a token refresh for the
   * same device is a last-writer-wins upsert in place rather than a new record.
   */
  deviceId?: string;
  channelType?: ChannelType;
  /**
   * Client OS platform (e.g. `Android` / `iOS`) recorded on the device object.
   * Falls back to `userProfile.demographic.platform` when omitted.
   */
  platform?: string;
  /**
   * App version at device registration, recorded on the device object. Falls
   * back to `userProfile.demographic.appVersion` when omitted.
   */
  appVersion?: string;
  /**
   * Accepted for API compatibility with the shared Pinpoint-style options, but
   * has NO effect: it is not written to the device object nor the profile.
   */
  optOut?: OptOut;
};

export type IdentifyUserRequest = {
  /**
   * Client-supplied identifier. Stored ONLY as the `appUserId` attribute.
   * It is NEVER used as the profile identity key — the authoritative identity
   * is the verified Cognito `sub` from the JWT authorizer claims.
   */
  userId?: string;
  userProfile: UserProfile;
  options?: IdentifyUserOptions;
};

export type SuccessResponse = {
  status: 'ok';
};

export type ErrorResponse = {
  error: string;
};
