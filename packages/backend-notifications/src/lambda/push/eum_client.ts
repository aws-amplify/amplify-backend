// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import { buildMessageConfiguration } from './payload.js';
import { DeviceDeliveryResult, PushChannelType, PushMessage } from './types.js';

/**
 * Case-insensitive substrings of a Pinpoint per-address `StatusMessage` that
 * indicate the DEVICE TOKEN itself is permanently invalid — the ONLY condition
 * that justifies deleting the backing device record (stale-token cleanup).
 *
 * - APNs: `BadDeviceToken`, `Unregistered`, `DeviceTokenNotForTopic`
 * - FCM / GCM legacy HTTP API: `NotRegistered`, `InvalidRegistration`,
 *   `MismatchSenderId`
 * - FCM HTTP v1 (current API): `UNREGISTERED` (matched by the APNs
 *   `Unregistered` entry), `SENDER_ID_MISMATCH`, and a malformed token's
 *   `INVALID_ARGUMENT` whose per-field message is "...not a valid FCM
 *   registration token"
 *
 * Everything else that yields a non-delivery — a channel that is not enabled on
 * the EUM/Pinpoint application, missing channel credentials, `OPT_OUT`,
 * `THROTTLED`, `TEMPORARY_FAILURE`, or a `PERMANENT_FAILURE` whose message does
 * not match a token-invalidity signal — is treated as a transient / config
 * problem and the token is KEPT. Deleting on those would wrongly wipe valid
 * device registrations (e.g. when the app simply has no APNS/GCM channel yet).
 */
const INVALID_TOKEN_INDICATORS = [
  // APNs
  'BadDeviceToken',
  'Unregistered',
  'DeviceTokenNotForTopic',
  // FCM / GCM legacy HTTP API
  'NotRegistered',
  'InvalidRegistration',
  'MismatchSenderId',
  // FCM HTTP v1 (current API). v1 reports token invalidity with different
  // strings than the legacy API: `UNREGISTERED` (already matched
  // case-insensitively by the APNs `Unregistered` entry), `SENDER_ID_MISMATCH`,
  // and a malformed / non-FCM token as `INVALID_ARGUMENT` carrying the specific
  // per-field message matched below. Match that exact token phrase rather than
  // bare `INVALID_ARGUMENT` — the latter also covers non-token payload errors,
  // so matching it broadly could wrongly delete a valid device on a
  // malformed-message bug.
  'SENDER_ID_MISMATCH',
  'not a valid FCM registration token',
];

/**
 * Decide whether a per-address delivery failure represents a permanently
 * invalid TOKEN (safe to delete) versus a channel / app misconfiguration or
 * transient error (keep the token).
 *
 * Conservative by design: returns `true` ONLY for a `PERMANENT_FAILURE` whose
 * `StatusMessage` matches a known invalid-token indicator. The default for any
 * ambiguous or unknown failure is `false` (keep the device).
 */
export const isInvalidTokenFailure = (
  status: string,
  statusMessage: string | undefined,
): boolean => {
  if (status !== 'PERMANENT_FAILURE') {
    return false;
  }
  const haystack = (statusMessage ?? '').toLowerCase();
  return INVALID_TOKEN_INDICATORS.some((indicator) =>
    haystack.includes(indicator.toLowerCase()),
  );
};

/**
 * Deliver a single push to one device via AWS End User Messaging (Pinpoint
 * `SendMessages`), addressing the message to the device token on its channel.
 *
 * Returns a structured per-device result classifying the Pinpoint
 * `DeliveryStatus` into delivered / failed and flagging ONLY a genuinely
 * invalid token as `stale` (via {@link isInvalidTokenFailure}) so the caller
 * can delete its device object. A thrown call (e.g. the channel is not
 * configured on the EUM app) is caught and reported as `status: 'ERROR'`
 * (failed, NOT stale — the token itself may be fine).
 *
 * Emits greppable `[push] send.response` / `[push] classify` log lines carrying
 * the request channel and the per-address response (DeliveryStatus /
 * StatusCode / StatusMessage) plus the keep-vs-delete decision, so a failed
 * send can be diagnosed as channel-not-enabled vs invalid-token from the logs.
 * These carry NO device token, profile id, or message copy.
 */
export const deliverToDevice = async (
  pinpoint: PinpointClient,
  applicationId: string,
  deviceToken: string,
  channelType: PushChannelType,
  message: PushMessage,
  deviceId: string,
): Promise<DeviceDeliveryResult> => {
  try {
    const messageConfiguration = buildMessageConfiguration(
      channelType,
      message,
    );

    const res = await pinpoint.send(
      new SendMessagesCommand({
        ApplicationId: applicationId,
        MessageRequest: {
          Addresses: {
            [deviceToken]: { ChannelType: channelType },
          },
          MessageConfiguration: messageConfiguration,
        },
      }),
    );

    const result = res.MessageResponse?.Result?.[deviceToken];
    const status = result?.DeliveryStatus ?? 'UNKNOWN_FAILURE';
    const statusCode = result?.StatusCode;
    const statusMessage = result?.StatusMessage;
    const stale = isInvalidTokenFailure(status, statusMessage);

    console.log(
      '[push] send.response',
      JSON.stringify({
        channelType,
        deliveryStatus: status,
        statusCode,
        statusMessage,
      }),
    );
    console.log(
      '[push] classify',
      JSON.stringify({
        channelType,
        deliveryStatus: status,
        decision: stale ? 'STALE_DELETE' : 'KEEP',
        reason: stale
          ? 'StatusMessage matched an invalid-token indicator'
          : `not a token-invalidity signal (status=${status})`,
        statusMessage,
      }),
    );

    return {
      deviceToken,
      channelType,
      deviceId,
      status,
      delivered: status === 'SUCCESSFUL',
      stale,
      statusCode,
      statusMessage,
    };
  } catch (err) {
    const statusMessage = err instanceof Error ? err.message : 'unknown error';
    const errorName = err instanceof Error ? err.name : undefined;
    console.log(
      '[push] send.error',
      JSON.stringify({
        channelType,
        deliveryStatus: 'ERROR',
        decision: 'KEEP',
        reason: 'SendMessages threw (e.g. channel not configured) — token kept',
        errorName,
        statusMessage,
      }),
    );
    return {
      deviceToken,
      channelType,
      deviceId,
      status: 'ERROR',
      delivered: false,
      stale: false,
      statusMessage,
      ...(errorName ? { errorName } : {}),
    };
  }
};
