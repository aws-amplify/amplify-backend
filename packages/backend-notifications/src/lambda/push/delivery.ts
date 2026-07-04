// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { PinpointClient } from '@aws-sdk/client-pinpoint';

import { deliverToDevice } from './eum_client.js';
import { maskToken } from '../shared/mask.js';
import { deleteDevice, listDevices } from './device_lookup.js';
import { normalizeChannelType } from './payload.js';
import {
  PushTemplateContext,
  renderProfileChannelMessages,
} from './message_template.js';
import {
  DeviceDeliveryResult,
  ParsedPushEvent,
  ProfileDeliveryResult,
  ProfileTarget,
  PushChannelType,
  PushDeliveryResponse,
  PushMessage,
} from './types.js';

/** Injected clients + resolved config for the delivery routines. */
export type DeliveryDeps = {
  profiles: CustomerProfilesClient;
  pinpoint: PinpointClient;
  /** Customer Profiles domain to resolve devices from. */
  domainName: string;
  /** AWS End User Messaging / Pinpoint application id to send from. */
  applicationId: string;
  /**
   * The resolved Q in Connect PUSH message template for this journey run, when
   * one was found (see {@link resolvePushTemplateContext}). When present, each
   * profile's copy is rendered from the template (per-platform) and takes
   * precedence over the CustomerData / event / default copy; when absent,
   * delivery uses the non-templated per-profile copy exactly as before.
   */
  templateContext?: PushTemplateContext;
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
 *
 * `message` is the profile's fallback copy. When `perChannel` is supplied (from
 * a rendered Q Connect template), the message for a device's channel is taken
 * from it (falling back to `message` for any channel the template did not
 * define), so iOS (`APNS`) and Android (`GCM`) devices can receive
 * platform-specific copy.
 */
export const deliverToProfile = async (
  deps: DeliveryDeps,
  target: ProfileTarget,
  message: PushMessage,
  perChannel?: Partial<Record<PushChannelType, PushMessage>>,
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

    const channelMessage = perChannel?.[channelType] ?? message;
    const outcome = await deliverToDevice(
      pinpoint,
      applicationId,
      device.deviceToken,
      channelType,
      channelMessage,
    );
    outcome.objectUniqueKey = device.objectUniqueKey;
    results.push(outcome);

    if (outcome.delivered) {
      delivered += 1;
    } else {
      failed += 1;
    }

    if (outcome.stale) {
      console.log(
        '[push] cleanup.delete',
        JSON.stringify({
          profileId: target.profileId,
          objectUniqueKey: device.objectUniqueKey,
          deviceToken: maskToken(device.deviceToken),
          channelType,
          reason: outcome.statusMessage ?? outcome.status,
        }),
      );
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
 * Deliver to every targeted profile, aggregating a per-profile summary. Each
 * profile's copy is resolved as: the rendered Q Connect PUSH template (per
 * platform), falling back to the safe DEFAULT copy (`DEFAULT_PUSH_TITLE` /
 * `DEFAULT_PUSH_BODY`) for any channel the template did not resolve for
 * (no template, render miss, or the unresolved-placeholder guard rejected it).
 * Profiles are processed sequentially to keep the per-profile Customer Profiles
 * write ordering simple; batches are typically small per Journey invocation.
 */
export const deliverToTargets = async (
  deps: DeliveryDeps,
  parsed: ParsedPushEvent,
): Promise<PushDeliveryResponse> => {
  const results: ProfileDeliveryResult[] = [];
  for (const target of parsed.targets) {
    // The safe DEFAULT copy is the ONLY fallback: real journeys carry no
    // per-profile or event-level message copy, so personalized copy comes
    // solely from the rendered template below.
    const fallback = parsed.message;

    // When a Q Connect PUSH template was resolved for this journey run, render
    // it per profile to get personalized, per-platform (APNS / GCM) copy that
    // takes precedence over the default fallback. A render miss/failure (or a
    // placeholder-guard rejection) leaves `perChannel` undefined so delivery
    // uses the default copy.
    let perChannel: Partial<Record<PushChannelType, PushMessage>> | undefined;
    if (deps.templateContext) {
      perChannel = await renderProfileChannelMessages(
        deps.templateContext,
        target,
      );
    }

    // NOTE (PII / not production-safe): title/body may echo template-rendered
    // copy; logged here to confirm the EFFECTIVE per-channel copy that will
    // actually be delivered. Reduce/omit before production.
    //
    // `effective` is exactly what each channel sends: the rendered template copy
    // for every channel the template resolved, and the DEFAULT for any channel
    // it did not (shown as the `default` entry). When no template applied at
    // all, every channel gets the default.
    const effective: Record<string, { title: string; body: string }> =
      perChannel
        ? {
            ...Object.fromEntries(
              Object.entries(perChannel).map(([channel, m]) => [
                channel,
                { title: m.title, body: m.body },
              ]),
            ),
            default: { title: fallback.title, body: fallback.body },
          }
        : {
            all: { title: fallback.title, body: fallback.body },
          };
    console.log(
      '[push] resolveMessage',
      JSON.stringify({
        profileId: target.profileId,
        templateApplied: Boolean(perChannel),
        effective,
        defaultTitle: fallback.title,
        defaultBody: fallback.body,
        hasData: Boolean(fallback.data),
      }),
    );
    results.push(await deliverToProfile(deps, target, fallback, perChannel));
  }

  return {
    profilesProcessed: results.length,
    totalDelivered: results.reduce((n, r) => n + r.delivered, 0),
    totalFailed: results.reduce((n, r) => n + r.failed, 0),
    totalCleaned: results.reduce((n, r) => n + r.cleaned, 0),
    results,
  };
};
