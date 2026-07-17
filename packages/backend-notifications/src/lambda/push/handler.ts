// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { PinpointClient } from '@aws-sdk/client-pinpoint';
import { ConnectCampaignsV2Client } from '@aws-sdk/client-connectcampaignsv2';
import { ConnectClient } from '@aws-sdk/client-connect';
import { QConnectClient } from '@aws-sdk/client-qconnect';

import { ENV_DOMAIN_NAME, ENV_EUM_APPLICATION_ID } from '../../constants.js';
import { parsePushEvent } from './event.js';
import { deliverToTargets, mapToConnectResponse } from './delivery.js';
import {
  PushTemplateContext,
  resolvePushTemplateContext,
} from './message_template.js';
import { ConnectBatchResponse } from './types.js';

/**
 * Module-level clients so warm invocations reuse the connection pool. Region is
 * resolved from the standard AWS_REGION Lambda environment variable.
 *
 * `campaigns` / `connect` / `qconnect` back runtime message-template resolution:
 * discovering the Q in Connect knowledge base from the journey's campaign and
 * rendering the PUSH template whose name matches the Custom-action ActionId.
 */
const profiles = new CustomerProfilesClient({});
const pinpoint = new PinpointClient({});
const campaigns = new ConnectCampaignsV2Client({});
const connect = new ConnectClient({});
const qconnect = new QConnectClient({});

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
 * Returns the Amazon Connect batch response contract: one `CustomerProfiles`
 * entry per requested `ProfileId`, each carrying a per-profile delivered /
 * skipped / failed `ResultData`. Per-profile errors are caught so the batch
 * never throws (a thrown handler fails EVERY profile); only a truly systemic
 * failure (e.g. missing configuration) throws.
 */
export const handler = async (
  event: unknown,
): Promise<ConnectBatchResponse> => {
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
  // Operational signals only: how many profiles the batch targeted and the
  // (non-personal) campaign / action identifiers. Profile ids and message copy
  // are deliberately NOT logged.
  console.log(
    '[push] parsed',
    JSON.stringify({
      profileCount: parsed.targets.length,
      campaign: parsed.campaign ?? null,
    }),
  );

  if (parsed.targets.length === 0) {
    console.warn('[push] no resolvable profile targets in event');
    return { Items: { CustomerProfiles: [] } };
  }

  // Resolve the Q in Connect PUSH message template ONCE per invocation (KB
  // discovery + template lookup are per-journey, not per-profile). When the
  // event carries campaign metadata, the template whose name == the
  // Custom-action ActionId is used to render personalized per-platform copy;
  // otherwise (or on any miss/failure) delivery falls back to the safe DEFAULT
  // copy.
  let templateContext: PushTemplateContext | undefined;
  if (parsed.campaign) {
    templateContext = await resolvePushTemplateContext(
      { campaigns, connect, qconnect },
      parsed.campaign,
    );
  }

  const outcomes = await deliverToTargets(
    { profiles, pinpoint, domainName, applicationId, templateContext },
    parsed,
  );

  // Operational signal only: per-status counts (no profile ids or copy).
  console.log(
    '[push] summary',
    JSON.stringify({
      profilesProcessed: outcomes.length,
      delivered: outcomes.filter((o) => o.status === 'delivered').length,
      skipped: outcomes.filter((o) => o.status === 'skipped').length,
      failed: outcomes.filter((o) => o.status === 'failed').length,
    }),
  );

  return mapToConnectResponse(parsed.targets, outcomes);
};
