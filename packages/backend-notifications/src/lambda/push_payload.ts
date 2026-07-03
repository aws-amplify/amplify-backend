// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { DirectMessageConfiguration } from '@aws-sdk/client-pinpoint';
import { PushChannelType, PushMessage } from './push_types.js';

/**
 * Normalize a stored / event channel identifier to a Pinpoint push channel.
 *
 * The identify path stores whatever channel the client registered. Clients (and
 * Firebase) use several spellings for Android push — `FCM` (the current Firebase
 * Cloud Messaging name) is normalized to `GCM` (the Pinpoint channel that
 * fronts FCM). Apple variants map to `APNS` / `APNS_SANDBOX`. Anything else
 * (e.g. `IN_APP`, empty, unknown) yields `undefined` so the caller skips it.
 */
export const normalizeChannelType = (
  raw: string | undefined,
): PushChannelType | undefined => {
  if (!raw) {
    return undefined;
  }
  switch (raw.trim().toUpperCase()) {
    case 'FCM':
    case 'GCM':
      return 'GCM';
    case 'APNS':
      return 'APNS';
    case 'APNS_SANDBOX':
    case 'APNSSANDBOX':
      return 'APNS_SANDBOX';
    default:
      return undefined;
  }
};

/**
 * Build the Pinpoint `DirectMessageConfiguration` for a single device, carrying
 * only the platform message matching that device's channel.
 *
 * - `GCM` -> `GCMMessage` (Android / FCM)
 * - `APNS` / `APNS_SANDBOX` -> `APNSMessage` (iOS)
 *
 * `title` / `body` map to the platform message's `Title` / `Body`; optional
 * `data` maps to the platform `Data` map so the client receives the custom
 * payload alongside the notification.
 */
export const buildMessageConfiguration = (
  channelType: PushChannelType,
  message: PushMessage,
): DirectMessageConfiguration => {
  const common = {
    Title: message.title,
    Body: message.body,
    ...(message.data ? { Data: message.data } : {}),
  };

  if (channelType === 'GCM') {
    return { GCMMessage: { ...common, Priority: 'high' } };
  }
  // APNS and APNS_SANDBOX both use APNSMessage; the channel is selected per
  // address via AddressConfiguration.ChannelType.
  return { APNSMessage: common };
};
