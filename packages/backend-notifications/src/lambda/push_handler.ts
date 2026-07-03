// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { PinpointClient } from '@aws-sdk/client-pinpoint';

import { ENV_DOMAIN_NAME, ENV_EUM_APPLICATION_ID } from '../constants.js';
import { parsePushEvent } from './push_event.js';
import { deliverToTargets } from './push_delivery.js';
import { PushDeliveryResponse } from './push_types.js';

/**
 * Module-level clients so warm invocations reuse the connection pool. Region is
 * resolved from the standard AWS_REGION Lambda environment variable.
 */
const profiles = new CustomerProfilesClient({});
const pinpoint = new PinpointClient({});

/**
 * Push-delivery Lambda invoked by an Amazon Connect Journey Custom-action
 * (Invoke Lambda) block. Amazon Connect has no native mobile-push channel, so
 * this Lambda bridges the gap: it resolves each targeted profile's registered
 * devices from Customer Profiles (ListProfileObjects on the AmplifyDevice
 * object type) and delivers the message to each device via AWS End User
 * Messaging (Pinpoint `SendMessages`), mapping the device's channel to a
 * GCM (Android/FCM) or APNS (iOS) payload. Tokens permanently rejected by the
 * push provider are cleaned up by deleting their AmplifyDevice object.
 *
 * Returns a per-profile delivered / failed / cleaned summary.
 */
export const handler = async (
  event: unknown,
): Promise<PushDeliveryResponse> => {
  // Top priority: capture the EXACT raw event so the real Connect Journey
  // Custom-action envelope shape can be inspected from CloudWatch.
  //
  // NOTE (PII / not production-safe): the raw event carries `CustomerData`
  // (name / email / phone / attributes) and this logs it UNREDACTED. This is a
  // deliberate diagnostic to discover the (undocumented) Journey payload shape.
  // Before production this MUST be gated off / reduced to the structural
  // envelope (top-level keys + item count) only.
  console.log('[push] rawEvent', JSON.stringify(event));

  const domainName = process.env[ENV_DOMAIN_NAME];
  const applicationId = process.env[ENV_EUM_APPLICATION_ID];
  if (!domainName || !applicationId) {
    throw new Error(
      `Missing required env var(s): ${[
        !domainName ? ENV_DOMAIN_NAME : undefined,
        !applicationId ? ENV_EUM_APPLICATION_ID : undefined,
      ]
        .filter(Boolean)
        .join(', ')}`,
    );
  }

  const parsed = parsePushEvent(event);
  // NOTE (PII / not production-safe): `profileIds` are customer-identifiable.
  // Kept here for PoC diagnosis; hash or omit before production.
  console.log(
    '[push] parsed',
    JSON.stringify({
      parsePath: parsed.parsePath,
      profileCount: parsed.targets.length,
      profileIds: parsed.targets.map((t) => t.profileId),
      campaign: parsed.campaign ?? null,
      message: {
        title: parsed.message.title,
        body: parsed.message.body,
        hasData: Boolean(parsed.message.data),
      },
    }),
  );

  if (parsed.targets.length === 0) {
    console.warn('[push] no resolvable profile targets in event');
    return {
      profilesProcessed: 0,
      totalDelivered: 0,
      totalFailed: 0,
      totalCleaned: 0,
      results: [],
    };
  }

  const summary = await deliverToTargets(
    { profiles, pinpoint, domainName, applicationId },
    parsed,
  );

  console.log(
    '[push] summary',
    JSON.stringify({
      profilesProcessed: summary.profilesProcessed,
      totalDelivered: summary.totalDelivered,
      totalFailed: summary.totalFailed,
      totalCleaned: summary.totalCleaned,
    }),
  );

  return summary;
};
