// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Frozen contract for the push-delivery Lambda.
 *
 * Amazon Connect has no native mobile-push channel. Delivery is a workaround:
 * an Amazon Connect Outbound Campaigns v2 / Journey BATCH custom action invokes
 * THIS Lambda, which resolves each targeted profile's registered devices from
 * Customer Profiles and pushes to them via AWS End User Messaging (the Pinpoint
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
};

/**
 * A single profile the batch action targeted, as surfaced to this Lambda.
 * Mirrors a Connect batch `Items.CustomerProfiles[]` entry: the resolved
 * `ProfileId` plus a bag of profile fields / attributes (`CustomerData`).
 */
export type ProfileTarget = {
  /** The Customer Profiles ProfileId to deliver to. */
  profileId: string;
  /**
   * The profile's standard fields + Attributes as delivered by Connect
   * (camelCase: `firstName`, `attributes.*`, ...). Passed as flat
   * `customAttributes` to personalize the rendered Q Connect PUSH template (see
   * `renderProfileChannelMessages`); real journeys carry NO message copy here.
   * Device tokens are always resolved authoritatively via ListProfileObjects,
   * never from here.
   */
  customerData?: Record<string, unknown>;
  /**
   * The per-item `IdempotencyToken` carried on the batch request entry.
   * Retained for logging / future idempotency de-duplication only — it is NEVER
   * echoed as a response key (the response is keyed solely by `Id`/ProfileId).
   */
  idempotencyToken?: string;
};

/**
 * The Outbound Campaigns v2 journey context carried on the real invocation
 * envelope under `InvocationMetadata.CampaignContext`. Extracted for
 * observability and to resolve the Q Connect PUSH template. All fields
 * optional/defensive since direct-invoke test payloads omit them.
 */
export type CampaignContext = {
  /** The Connect campaign / journey id. */
  campaignId?: string;
  /** The journey action id (e.g. the Custom-action block name). */
  actionId?: string;
};

/** The normalized result of parsing a raw Connect batch custom-action event. */
export type ParsedPushEvent = {
  /** Every profile the event targeted (batches are flattened). */
  targets: ProfileTarget[];
  /**
   * The safe DEFAULT push copy ({@link DEFAULT_PUSH_TITLE} /
   * {@link DEFAULT_PUSH_BODY}) used as the fallback when no Q Connect template
   * copy applies for a channel. Real journeys carry no event-level copy.
   */
  message: PushMessage;
  /**
   * The journey/campaign context from `InvocationMetadata.CampaignContext`,
   * when present on the envelope (real Outbound Campaigns v2 journeys), else
   * `undefined` (direct-invoke test payloads).
   */
  campaign?: CampaignContext;
};

/**
 * The raw Amazon Connect batch custom-action wire envelope, for internal
 * narrowing from the `unknown` handler boundary. Everything is optional /
 * defensive: the parser tolerates missing or malformed fields rather than
 * aborting the batch.
 */
/* eslint-disable @typescript-eslint/naming-convention -- Amazon Connect batch
   custom-action wire envelope is PascalCase by contract. */
export type ConnectBatchRequest = {
  InvocationMetadata?: {
    CampaignContext?: {
      CampaignId?: string;
      CampaignName?: string;
      ActionId?: string;
      RunId?: string;
    };
  };
  Items?: {
    CustomerProfiles?: Array<{
      ProfileId: string;
      CustomerData?: string;
      IdempotencyToken?: string;
    }>;
  };
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Per-profile delivery outcome returned to Amazon Connect in each
 * `CustomerProfiles[].ResultData`.
 *
 * - `delivered` — at least one of the profile's devices was pushed to.
 * - `skipped`   — nothing to do (e.g. the profile has no registered devices);
 *   carries a `reason`.
 * - `failed`    — every delivery attempt errored; carries `retryable` +
 *   `errorCode` so Connect can decide whether to retry, plus optional free-text
 *   `error` for humans / logs (never used for branching).
 */
export type ProfileResultData = {
  status: 'delivered' | 'skipped' | 'failed';
  /** Whether Connect should retry this profile (transient failures only). */
  retryable?: boolean;
  /**
   * A machine-readable failure code. Passed through from the AWS SDK error
   * `name` (an open string — deliberately NOT an enum), or the Pinpoint
   * per-address delivery status when no SDK error was thrown.
   */
  errorCode?: string;
  /** Free-text failure detail for humans / logs. Never used for branching. */
  error?: string;
  /** Why a profile was skipped (e.g. `no_devices`). */
  reason?: string;
};

/**
 * Internal per-profile delivery outcome (ProfileResultData + the profile id it
 * belongs to). Aggregated by the delivery layer and mapped to the Connect
 * response by {@link mapToConnectResponse}. REPLACES the former
 * `ProfileDeliveryResult` (no counts).
 */
export type ProfileOutcome = ProfileResultData & { profileId: string };

/**
 * The batch response contract Amazon Connect Outbound Campaigns v2 / Journey
 * expects back from a custom-action Lambda.
 *
 *   { "Items": { "CustomerProfiles": [ { "Id": "<ProfileId>", "ResultData": { ... } } ] } }
 *
 * `Id` MUST exactly equal the request's `ProfileId`, and there MUST be exactly
 * one entry per requested `ProfileId` (a missing entry makes Connect treat that
 * profile as failed). See {@link mapToConnectResponse}.
 */
/* eslint-disable @typescript-eslint/naming-convention -- Amazon Connect batch
   response contract is PascalCase by contract. */
export type ConnectBatchResponse = {
  Items: {
    CustomerProfiles: Array<{
      Id: string;
      ResultData?: ProfileResultData;
    }>;
  };
};
/* eslint-enable @typescript-eslint/naming-convention */

/**
 * Delivery outcome for a single device (one `SendMessages` call). Transient
 * derivation input ONLY — the per-profile {@link ProfileOutcome} is derived
 * from a profile's device results and this shape is never returned to Connect.
 */
export type DeviceDeliveryResult = {
  /** The push token the message was addressed to. */
  deviceToken: string;
  /** The (normalized) channel the message was sent on. */
  channelType: PushChannelType;
  /**
   * The stable `deviceId` (DynamoDB Devices table PK) this token came from —
   * carried so a permanently-rejected token's device record can be deleted.
   */
  deviceId?: string;
  /**
   * Pinpoint `DeliveryStatus` (`SUCCESSFUL`, `PERMANENT_FAILURE`, ...), or
   * `ERROR` when the `SendMessages` call itself threw, or `SKIPPED` when the
   * device could not be delivered to (e.g. unsupported / missing channel).
   */
  status: string;
  /** Whether delivery succeeded. */
  delivered: boolean;
  /**
   * Whether this represents a permanently-invalid TOKEN whose backing device
   * record should be deleted (stale-token cleanup). Set ONLY for a
   * token-invalidity signal (see `isInvalidTokenFailure`); channel / app
   * misconfiguration and transient failures are `false` (token kept).
   */
  stale: boolean;
  /** Pinpoint numeric status code, when available. */
  statusCode?: number;
  /** Human-readable status / error detail. */
  statusMessage?: string;
  /**
   * The AWS SDK error `name` when the `SendMessages` call threw (e.g.
   * `ThrottlingException`, `ValidationException`). Used to derive the profile's
   * `errorCode` + `retryable` classification.
   */
  errorName?: string;
};
