// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../../constants.js';
import { CampaignContext, ParsedPushEvent, ProfileTarget } from './types.js';

/**
 * Parse a raw Amazon Connect batch custom-action event into a flat list of
 * profile targets plus the message to deliver.
 *
 * CANONICAL shape — the Amazon Connect Outbound Campaigns v2 / Journey BATCH
 * invocation, confirmed verbatim from a live journey run (see
 * `fixtures/real_journey_event.ts` for the source-log reference). This is the
 * ONLY shape Connect sends:
 *
 *   {
 *     InvocationMetadata: { CampaignContext: { CampaignId, ActionId, ... } },
 *     Items: { CustomerProfiles: [ { ProfileId, CustomerData, IdempotencyToken }, ... ] }
 *   }
 *
 * Shape specifics (all PascalCase on the envelope):
 *   - `Items` is an OBJECT `{ CustomerProfiles: [...] }`;
 *   - each entry carries a top-level `ProfileId` (used for device lookup) and
 *     an `IdempotencyToken`;
 *   - each entry's `CustomerData` is a SERIALIZED JSON STRING with camelCase
 *     keys (`profileId`, `firstName`, `attributes.*`) that is `JSON.parse`d.
 *
 * The handler keeps the `event: unknown` boundary; this narrows it to the
 * canonical Connect batch shape via defensive guards. Missing / malformed fields
 * are skipped rather than aborting the batch. The real journey carries NO
 * message copy, so {@link ParsedPushEvent.message} is always the safe
 * {@link DEFAULT_PUSH_TITLE} / {@link DEFAULT_PUSH_BODY}; personalized copy comes
 * from the Q Connect PUSH template rendered per profile downstream.
 */
export const parsePushEvent = (event: unknown): ParsedPushEvent => {
  const root: Record<string, unknown> = isRecord(event) ? event : {};
  const targets = extractTargets(root);
  const campaign = extractCampaign(root);
  return {
    targets,
    message: { title: DEFAULT_PUSH_TITLE, body: DEFAULT_PUSH_BODY },
    ...(campaign ? { campaign } : {}),
  };
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Read the owning `principalId` from a parsed `CustomerData` bag at
 * `attributes.principalId` — the profile key attribute the identify Lambda
 * mirrors onto the Customer Profile (object-type field
 * `_profile.Attributes.principalId`). This is what lets the delivery path
 * resolve devices via the DDB GSI(principalId) with NO Customer Profiles call.
 */
const extractPrincipalId = (
  customerData: Record<string, unknown> | undefined,
): string | undefined => {
  if (!customerData) {
    return undefined;
  }
  const attributes = customerData.attributes;
  if (!isRecord(attributes)) {
    return undefined;
  }
  return asString(attributes.principalId);
};

/**
 * Extract profile targets from the canonical `Items.CustomerProfiles[]` array.
 * Each entry contributes its `ProfileId`, parsed `CustomerData`, and
 * `IdempotencyToken`; entries without a usable `ProfileId` are skipped.
 */
const extractTargets = (root: Record<string, unknown>): ProfileTarget[] => {
  const targets: ProfileTarget[] = [];

  const items: unknown = root.Items;
  const customerProfiles = isRecord(items) ? items.CustomerProfiles : undefined;
  if (Array.isArray(customerProfiles)) {
    for (const entry of customerProfiles) {
      if (!isRecord(entry)) {
        continue;
      }
      const profileId = asString(entry.ProfileId);
      if (!profileId) {
        continue;
      }
      const idempotencyToken = asString(entry.IdempotencyToken);
      const customerData = coerceCustomerData(entry.CustomerData);
      targets.push({
        profileId,
        ...(extractPrincipalId(customerData)
          ? { principalId: extractPrincipalId(customerData) }
          : {}),
        customerData,
        ...(idempotencyToken ? { idempotencyToken } : {}),
      });
    }
  }

  return targets;
};

/**
 * Coerce a raw `CustomerData` value into a property bag.
 *
 * The real Connect journey delivers `CustomerData` as a SERIALIZED JSON STRING
 * (camelCase keys), so a string is `JSON.parse`d. Minimal defensive tolerance:
 * a value already given as a plain object is used as-is. Anything else — or a
 * string that isn't valid JSON, or JSON that isn't an object — yields
 * `undefined` so a malformed entry never aborts the batch.
 */
const coerceCustomerData = (
  raw: unknown,
): Record<string, unknown> | undefined => {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) {
      return undefined;
    }
    try {
      const parsed: unknown = JSON.parse(trimmed);
      return isRecord(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }
  return isRecord(raw) ? raw : undefined;
};

/**
 * Extract the Outbound Campaigns v2 journey context from
 * `InvocationMetadata.CampaignContext`, when present. Only `campaignId` and
 * `actionId` are retained (they drive Q Connect template resolution). Returns
 * `undefined` when the envelope carries no campaign metadata (e.g.
 * direct-invoke test payloads) or when neither field resolves.
 */
const extractCampaign = (
  root: Record<string, unknown>,
): CampaignContext | undefined => {
  const meta: unknown = root.InvocationMetadata;
  if (!isRecord(meta)) {
    return undefined;
  }
  const ctx: unknown = meta.CampaignContext;
  if (!isRecord(ctx)) {
    return undefined;
  }
  const campaign: CampaignContext = {
    campaignId: asString(ctx.CampaignId),
    actionId: asString(ctx.ActionId),
  };
  return Object.values(campaign).some((v) => v !== undefined)
    ? campaign
    : undefined;
};
