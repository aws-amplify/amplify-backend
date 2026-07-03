// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { PinpointClient } from '@aws-sdk/client-pinpoint';

import { deliverToDevice } from './eum_client.js';
import { deleteDevice, listDevices } from './push_device_lookup.js';
import { normalizeChannelType } from './push_payload.js';
import {
  DeviceDeliveryResult,
  ParsedPushEvent,
  ProfileDeliveryResult,
  ProfileTarget,
  PushDeliveryResponse,
  PushMessage,
} from './push_types.js';

/** Injected clients + resolved config for the delivery routines. */
export type DeliveryDeps = {
  profiles: CustomerProfilesClient;
  pinpoint: PinpointClient;
  /** Customer Profiles domain to resolve devices from. */
  domainName: string;
  /** AWS End User Messaging / Pinpoint application id to send from. */
  applicationId: string;
};

/**
 * Resolve a single profile's registered devices and push the message to each
 * via AWS End User Messaging, then clean up any device whose token was
 * permanently rejected (stale-token cleanup).
 *
 * A device with an unsupported / missing channel (post-normalization) is
 * recorded as a `SKIPPED` failure rather than being sent. A device whose
 * delivery returns `PERMANENT_FAILURE` has its AmplifyDevice object deleted;
 * the per-device result records whether that cleanup succeeded.
 */
export const deliverToProfile = async (
  deps: DeliveryDeps,
  target: ProfileTarget,
  message: PushMessage,
): Promise<ProfileDeliveryResult> => {
  const { profiles, pinpoint, domainName, applicationId } = deps;
  const devices = await listDevices(profiles, domainName, target.profileId);

  const results: DeviceDeliveryResult[] = [];
  let delivered = 0;
  let failed = 0;
  let cleaned = 0;

  for (const device of devices) {
    const channelType = normalizeChannelType(device.channelType);
    if (!channelType) {
      failed += 1;
      results.push({
        deviceToken: device.deviceToken,
        channelType: 'GCM',
        objectUniqueKey: device.objectUniqueKey,
        status: 'SKIPPED',
        delivered: false,
        stale: false,
        statusMessage: `Unsupported or missing channelType: ${
          device.channelType ?? '(none)'
        }`,
      });
      continue;
    }

    const outcome = await deliverToDevice(
      pinpoint,
      applicationId,
      device.deviceToken,
      channelType,
      message,
    );
    outcome.objectUniqueKey = device.objectUniqueKey;
    results.push(outcome);

    if (outcome.delivered) {
      delivered += 1;
    } else {
      failed += 1;
    }

    if (outcome.stale) {
      const deletedOk = await deleteDevice(
        profiles,
        domainName,
        target.profileId,
        device.objectUniqueKey,
      );
      if (deletedOk) {
        cleaned += 1;
      }
    }
  }

  return {
    profileId: target.profileId,
    delivered,
    failed,
    cleaned,
    devices: results,
  };
};

/**
 * Deliver the parsed event's message to every targeted profile, aggregating a
 * per-profile summary. Profiles are processed sequentially to keep the
 * per-profile Customer Profiles write ordering simple; batches are typically
 * small per Journey invocation.
 */
export const deliverToTargets = async (
  deps: DeliveryDeps,
  parsed: ParsedPushEvent,
): Promise<PushDeliveryResponse> => {
  const results: ProfileDeliveryResult[] = [];
  for (const target of parsed.targets) {
    results.push(await deliverToProfile(deps, target, parsed.message));
  }

  return {
    profilesProcessed: results.length,
    totalDelivered: results.reduce((n, r) => n + r.delivered, 0),
    totalFailed: results.reduce((n, r) => n + r.failed, 0),
    totalCleaned: results.reduce((n, r) => n + r.cleaned, 0),
    results,
  };
};
