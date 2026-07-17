// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { PinpointClient } from '@aws-sdk/client-pinpoint';

import { deliverToDevice } from './eum_client.js';
import { deleteDevice, listDevices } from '../shared/devices.js';
import { normalizeChannelType } from './payload.js';
import {
  PushTemplateContext,
  renderProfileChannelMessages,
} from './message_template.js';
import {
  ConnectBatchResponse,
  DeviceDeliveryResult,
  ParsedPushEvent,
  ProfileOutcome,
  ProfileResultData,
  ProfileTarget,
  PushChannelType,
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
   * precedence over the safe DEFAULT copy; when absent, delivery uses the
   * DEFAULT copy for every channel.
   */
  templateContext?: PushTemplateContext;
};

/**
 * AWS SDK error `name`s that represent a transient / retryable failure. Matched
 * exactly OR via the substring heuristic in {@link isRetryableFailure} (so new
 * throttling / timeout / server-fault variants classify correctly without an
 * enum).
 */
const RETRYABLE_ERROR_NAMES = new Set([
  'ThrottlingException',
  'TooManyRequestsException',
  'RequestThrottledException',
  'ProvisionedThroughputExceededException',
  'ServiceUnavailableException',
  'ServiceUnavailable',
  'InternalServerException',
  'InternalServerError',
  'InternalFailure',
  'RequestTimeout',
  'RequestTimeoutException',
  'TimeoutError',
]);

/**
 * Classify a single failed device delivery as retryable (transient — Connect
 * should retry) vs terminal (validation / not-found / unauthorized — do not
 * retry). Derived from the AWS SDK error `name` when the send threw, else from
 * the Pinpoint per-address delivery status / status code. Conservative default
 * is `false` (do not retry) for anything unrecognized.
 */
const isRetryableFailure = (r: DeviceDeliveryResult): boolean => {
  if (r.errorName) {
    if (RETRYABLE_ERROR_NAMES.has(r.errorName)) {
      return true;
    }
    return /throttl|timeout|unavailable|internal|serverfault|5\d\d/i.test(
      r.errorName,
    );
  }
  if (typeof r.statusCode === 'number' && r.statusCode >= 500) {
    return true;
  }
  switch (r.status) {
    case 'THROTTLED':
    case 'TEMPORARY_FAILURE':
      return true;
    default:
      return false;
  }
};

/**
 * The machine-readable failure code for a device delivery: the AWS SDK error
 * `name` when the send threw, else the Pinpoint per-address delivery status.
 */
const failureErrorCode = (r: DeviceDeliveryResult): string =>
  r.errorName ?? r.status;

/**
 * Derive a profile's {@link ProfileOutcome} from its per-device delivery
 * results:
 *   - >= 1 device delivered -> `delivered`
 *   - 0 devices             -> `skipped` (reason `no_devices`)
 *   - otherwise (all attempts errored) -> `failed`, with `retryable` +
 *     `errorCode` taken from a representative failing device (a retryable one
 *     is preferred so a batch with any transient failure is retried).
 */
const deriveProfileOutcome = (
  profileId: string,
  results: DeviceDeliveryResult[],
): ProfileOutcome => {
  if (results.length === 0) {
    return { profileId, status: 'skipped', reason: 'no_devices' };
  }
  if (results.some((r) => r.delivered)) {
    return { profileId, status: 'delivered' };
  }
  const failures = results.filter((r) => !r.delivered);
  const representative =
    failures.find((r) => isRetryableFailure(r)) ?? failures[0] ?? results[0];
  return {
    profileId,
    status: 'failed',
    retryable: isRetryableFailure(representative),
    errorCode: failureErrorCode(representative),
    ...(representative.statusMessage
      ? { error: representative.statusMessage }
      : {}),
  };
};

/**
 * Resolve a single profile's registered devices and push the message to each
 * via AWS End User Messaging, then clean up any device whose token was
 * permanently rejected (stale-token cleanup), and derive the profile's
 * {@link ProfileOutcome}.
 *
 * A device with an unsupported / missing channel (post-normalization) is
 * recorded as a `SKIPPED` per-device failure rather than being sent. A device
 * whose delivery returns an invalid-token `PERMANENT_FAILURE` has its
 * AmplifyDevice object deleted.
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
): Promise<ProfileOutcome> => {
  const { profiles, pinpoint, domainName, applicationId } = deps;
  const devices = await listDevices(profiles, domainName, target.profileId);

  const results: DeviceDeliveryResult[] = [];

  for (const device of devices) {
    const channelType = normalizeChannelType(device.channelType);
    if (!channelType) {
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

    if (outcome.stale) {
      // Cleanup decision only — no profile id or device token. `objectUniqueKey`
      // is an opaque service-generated key needed to correlate the delete.
      console.log(
        '[push] cleanup.delete',
        JSON.stringify({
          objectUniqueKey: device.objectUniqueKey,
          channelType,
          reason: outcome.statusMessage ?? outcome.status,
        }),
      );
      await deleteDevice(
        profiles,
        domainName,
        target.profileId,
        device.objectUniqueKey,
      );
    }
  }

  return deriveProfileOutcome(target.profileId, results);
};

/**
 * Deliver to every targeted profile, returning one {@link ProfileOutcome} per
 * target. Each profile's copy is resolved as: the rendered Q Connect PUSH
 * template (per platform), falling back to the safe DEFAULT copy for any
 * channel the template did not resolve for. Profiles are processed sequentially
 * to keep the per-profile Customer Profiles write ordering simple; batches are
 * typically small per invocation.
 *
 * Per-profile errors are CAUGHT and turned into a `failed` outcome so a single
 * bad profile never fails the whole batch (a thrown handler fails every
 * profile).
 */
export const deliverToTargets = async (
  deps: DeliveryDeps,
  parsed: ParsedPushEvent,
): Promise<ProfileOutcome[]> => {
  const outcomes: ProfileOutcome[] = [];
  for (const target of parsed.targets) {
    // The safe DEFAULT copy is the ONLY fallback: real journeys carry no
    // per-profile or event-level message copy, so personalized copy comes
    // solely from the rendered template below.
    const fallback = parsed.message;

    try {
      // When a Q Connect PUSH template was resolved for this journey run,
      // render it per profile to get personalized, per-platform (APNS / GCM)
      // copy that takes precedence over the default fallback. A render
      // miss/failure (or a placeholder-guard rejection) leaves `perChannel`
      // undefined so delivery uses the default copy.
      let perChannel: Partial<Record<PushChannelType, PushMessage>> | undefined;
      if (deps.templateContext) {
        perChannel = await renderProfileChannelMessages(
          deps.templateContext,
          target,
        );
      }

      // Operational signal only: whether a template applied and which channels
      // it resolved copy for. The rendered / default title and body are NOT
      // logged (they echo personalized customer copy).
      console.log(
        '[push] resolveMessage',
        JSON.stringify({
          templateApplied: Boolean(perChannel),
          channelsResolved: perChannel ? Object.keys(perChannel) : [],
        }),
      );
      outcomes.push(await deliverToProfile(deps, target, fallback, perChannel));
    } catch (err) {
      // A single profile's delivery failing must NOT fail the batch. Record it
      // as a retryable failure so Connect can retry just this profile.
      const errorName = err instanceof Error ? err.name : undefined;
      const statusCode = (err as { $metadata?: { httpStatusCode?: number } })
        ?.$metadata?.httpStatusCode;
      console.error(
        '[push] profile.error',
        JSON.stringify({ errorName, statusCode }),
      );
      outcomes.push({
        profileId: target.profileId,
        status: 'failed',
        retryable: true,
        errorCode: errorName ?? 'INTERNAL',
        ...(err instanceof Error ? { error: err.message } : {}),
      });
    }
  }

  return outcomes;
};

/**
 * Map the requested profiles + their derived outcomes to the Amazon Connect
 * batch response contract:
 *
 *   { Items: { CustomerProfiles: [ { Id: <ProfileId>, ResultData: { ... } } ] } }
 *
 * Guarantees EXACTLY ONE entry per requested `ProfileId`, keyed by `Id` =
 * profileId. A requested profile missing from `outcomes` (should never happen,
 * but Connect treats a missing entry as a hard failure) defaults to a
 * non-retryable `INTERNAL` failure so the response is always complete.
 */
export const mapToConnectResponse = (
  requestedProfiles: ProfileTarget[],
  outcomes: ProfileOutcome[],
): ConnectBatchResponse => {
  const byProfileId = new Map<string, ProfileOutcome>();
  for (const outcome of outcomes) {
    byProfileId.set(outcome.profileId, outcome);
  }

  const toResultData = (outcome: ProfileOutcome): ProfileResultData => {
    const { status, retryable, errorCode, error, reason } = outcome;
    return {
      status,
      ...(retryable !== undefined ? { retryable } : {}),
      ...(errorCode !== undefined ? { errorCode } : {}),
      ...(error !== undefined ? { error } : {}),
      ...(reason !== undefined ? { reason } : {}),
    };
  };

  return {
    Items: {
      CustomerProfiles: requestedProfiles.map((target) => {
        const outcome = byProfileId.get(target.profileId);
        return {
          Id: target.profileId,
          ResultData: outcome
            ? toResultData(outcome)
            : { status: 'failed', retryable: false, errorCode: 'INTERNAL' },
        };
      }),
    },
  };
};
