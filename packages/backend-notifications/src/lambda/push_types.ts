// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Frozen contract for the push-delivery Lambda.
 *
 * Amazon Connect has no native mobile-push channel. Delivery is a workaround:
 * a Connect Journey Custom-action (Invoke Lambda) block calls THIS Lambda,
 * which resolves each targeted profile's registered devices from Customer
 * Profiles and pushes to them via AWS End User Messaging (the Pinpoint
 * `SendMessages` API).
 *
 * These types mirror the JSON shapes the Lambda accepts / returns so the
 * handler, the parsing / payload / delivery layers, and the tests share one
 * source of truth.
 */

/** The push channels this backend can deliver to (post-normalization). */
export type PushChannelType = 'GCM' | 'APNS' | 'APNS_SANDBOX';

/** A single push notification's content. */
export type PushMessage = {
  /** Title shown above the notification. */
  title: string;
  /** Notification body text. */
  body: string;
  /**
   * Optional opaque data payload delivered alongside the notification (added to
   * the platform message's `Data` map, all values coerced to strings).
   */
  data?: Record<string, string>;
};

/**
 * A single profile the Journey targeted, as surfaced to this Lambda. Mirrors a
 * Connect Journey Custom-action `CustomerProfiles` entry: the resolved
 * `ProfileId` plus a bag of profile fields / attributes (`CustomerData`).
 */
export type ProfileTarget = {
  /** The Customer Profiles ProfileId to deliver to. */
  profileId: string;
  /**
   * The profile's standard fields + Attributes as delivered by Connect. Used
   * only as a fallback source for per-profile message overrides; device tokens
   * are always resolved authoritatively via ListProfileObjects.
   */
  customerData?: Record<string, unknown>;
};

/** The normalized result of parsing a raw Journey Custom-action event. */
export type ParsedPushEvent = {
  /** Every profile the event targeted (batches are flattened). */
  targets: ProfileTarget[];
  /** The message content resolved from the event (with defaults applied). */
  message: PushMessage;
};

/** Delivery outcome for a single device (one `SendMessages` call). */
export type DeviceDeliveryResult = {
  /** The push token the message was addressed to. */
  deviceToken: string;
  /** The (normalized) channel the message was sent on. */
  channelType: PushChannelType;
  /**
   * The Customer Profiles ProfileObjectUniqueKey of the AmplifyDevice object
   * this token came from — carried so a stale token can be deleted.
   */
  objectUniqueKey?: string;
  /**
   * Pinpoint `DeliveryStatus` (`SUCCESSFUL`, `PERMANENT_FAILURE`, ...), or
   * `ERROR` when the `SendMessages` call itself threw, or `SKIPPED` when the
   * device could not be delivered to (e.g. unsupported / missing channel).
   */
  status: string;
  /** Whether delivery succeeded. */
  delivered: boolean;
  /**
   * Whether this represents a permanently-invalid token whose backing
   * AmplifyDevice object should be deleted (stale-token cleanup).
   */
  stale: boolean;
  /** Pinpoint numeric status code, when available. */
  statusCode?: number;
  /** Human-readable status / error detail. */
  statusMessage?: string;
};

/** Aggregated delivery outcome for a single profile. */
export type ProfileDeliveryResult = {
  profileId: string;
  /** Number of devices delivered to successfully. */
  delivered: number;
  /** Number of devices that failed delivery. */
  failed: number;
  /** Number of stale device objects deleted during cleanup. */
  cleaned: number;
  /** Per-device breakdown. */
  devices: DeviceDeliveryResult[];
};

/**
 * The response returned to the Connect Journey Custom-action invocation.
 *
 * NOTE: Connect's exact expected custom-action response envelope for the
 * outbound-campaigns Journey batch is not publicly documented; this structured
 * per-profile summary is a best-effort shape and is flagged for review.
 */
export type PushDeliveryResponse = {
  /** Total profiles processed. */
  profilesProcessed: number;
  /** Total devices delivered to across all profiles. */
  totalDelivered: number;
  /** Total device deliveries that failed across all profiles. */
  totalFailed: number;
  /** Total stale device objects deleted across all profiles. */
  totalCleaned: number;
  /** Per-profile results. */
  results: ProfileDeliveryResult[];
};
