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
  if (parsed.targets.length === 0) {
    console.warn('Push event contained no resolvable profile targets');
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

  console.log('Push delivery summary', {
    profilesProcessed: summary.profilesProcessed,
    totalDelivered: summary.totalDelivered,
    totalFailed: summary.totalFailed,
    totalCleaned: summary.totalCleaned,
  });

  return summary;
};
