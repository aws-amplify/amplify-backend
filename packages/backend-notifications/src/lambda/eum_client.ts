// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { PinpointClient, SendMessagesCommand } from '@aws-sdk/client-pinpoint';
import { buildMessageConfiguration } from './push_payload.js';
import {
  DeviceDeliveryResult,
  PushChannelType,
  PushMessage,
} from './push_types.js';

/**
 * Pinpoint `DeliveryStatus` values that mean the push token is permanently
 * invalid and its backing device object should be deleted (stale-token
 * cleanup). `PERMANENT_FAILURE` covers unregistered / invalid tokens rejected
 * by FCM / APNs.
 */
const STALE_STATUSES = new Set<string>(['PERMANENT_FAILURE']);

/**
 * Deliver a single push to one device via AWS End User Messaging (Pinpoint
 * `SendMessages`), addressing the message to the device token on its channel.
 *
 * Returns a structured per-device result classifying the Pinpoint
 * `DeliveryStatus` into delivered / failed and flagging a permanently-invalid
 * token as `stale` so the caller can delete its device object. A thrown call
 * (e.g. the channel is not configured on the EUM app) is caught and reported as
 * `status: 'ERROR'` (failed, NOT stale — the token itself may be fine).
 */
export const deliverToDevice = async (
  pinpoint: PinpointClient,
  applicationId: string,
  deviceToken: string,
  channelType: PushChannelType,
  message: PushMessage,
): Promise<DeviceDeliveryResult> => {
  try {
    const res = await pinpoint.send(
      new SendMessagesCommand({
        ApplicationId: applicationId,
        MessageRequest: {
          Addresses: {
            [deviceToken]: { ChannelType: channelType },
          },
          MessageConfiguration: buildMessageConfiguration(channelType, message),
        },
      }),
    );

    const result = res.MessageResponse?.Result?.[deviceToken];
    const status = result?.DeliveryStatus ?? 'UNKNOWN_FAILURE';

    return {
      deviceToken,
      channelType,
      status,
      delivered: status === 'SUCCESSFUL',
      stale: STALE_STATUSES.has(status),
      statusCode: result?.StatusCode,
      statusMessage: result?.StatusMessage,
    };
  } catch (err) {
    return {
      deviceToken,
      channelType,
      status: 'ERROR',
      delivered: false,
      stale: false,
      statusMessage: err instanceof Error ? err.message : 'unknown error',
    };
  }
};
