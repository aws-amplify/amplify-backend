// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CUSTOMER_DATA_BODY_KEY,
  CUSTOMER_DATA_TITLE_KEY,
  DEFAULT_PUSH_BODY,
  DEFAULT_PUSH_TITLE,
} from '../../constants.js';
import {
  CampaignContext,
  MessageSource,
  ParsedPushEvent,
  ProfileTarget,
  PushEventParsePath,
  PushMessage,
  ResolvedProfileMessage,
} from './types.js';

/**
 * Parse a raw Connect Journey Custom-action event into a flat list of profile
 * targets plus the message to deliver.
 *
 * CANONICAL shape — the Amazon Connect Outbound Campaigns v2 journey
 * invocation, confirmed verbatim from a live journey run (see
 * `fixtures/real_journey_event.ts` for the source-log reference). This is the
 * ONLY shape Connect sends, and the single primary parse path:
 *
 *   {
 *     InvocationMetadata: { CampaignContext: { CampaignId, RunId, ActionId, CampaignName } },
 *     Items: { CustomerProfiles: [ { ProfileId, CustomerData, ... }, ... ] }
 *   }
 *
 * Shape specifics (all PascalCase on the envelope):
 *   - `Items` is an OBJECT `{ CustomerProfiles: [...] }`;
 *   - each entry carries a top-level `ProfileId` (used for device lookup);
 *   - each entry's `CustomerData` is a SERIALIZED JSON STRING with camelCase
 *     keys (`profileId`, `firstName`, `messageTitle`, `messageBody`,
 *     `attributes.*`) that is `JSON.parse`d.
 *
 * Minimal, documented defensive handling only: a `CustomerData` already given as
 * a parsed object is tolerated (see {@link coerceCustomerData}); missing /
 * malformed fields are skipped rather than aborting the batch. Message copy is
 * resolved per profile from `CustomerData.messageTitle` / `messageBody`, falling
 * back to the {@link DEFAULT_PUSH_TITLE} / {@link DEFAULT_PUSH_BODY} constants.
 */
export const parsePushEvent = (event: unknown): ParsedPushEvent => {
  const root = isRecord(event) ? event : {};
  const { targets, parsePath } = extractTargets(root);
  const campaign = extractCampaign(root);
  return {
    targets,
    message: { title: DEFAULT_PUSH_TITLE, body: DEFAULT_PUSH_BODY },
    parsePath,
    ...(campaign ? { campaign } : {}),
  };
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

/**
 * Extract profile targets from the canonical `Items.CustomerProfiles[]` array.
 * Each entry contributes its `ProfileId` + parsed `CustomerData`; entries
 * without a usable `ProfileId` are skipped.
 */
const extractTargets = (
  root: Record<string, unknown>,
): { targets: ProfileTarget[]; parsePath: PushEventParsePath } => {
  const targets: ProfileTarget[] = [];

  const items = root.Items;
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
      targets.push({
        profileId,
        customerData: coerceCustomerData(entry.CustomerData),
      });
    }
  }

  return { targets, parsePath: targets.length > 0 ? 'canonical' : 'none' };
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
 * `InvocationMetadata.CampaignContext`, when present. Returns `undefined` when
 * the envelope carries no campaign metadata (e.g. direct-invoke test payloads)
 * or when none of the expected fields resolve.
 */
const extractCampaign = (
  root: Record<string, unknown>,
): CampaignContext | undefined => {
  const meta = root.InvocationMetadata;
  if (!isRecord(meta)) {
    return undefined;
  }
  const ctx = meta.CampaignContext;
  if (!isRecord(ctx)) {
    return undefined;
  }
  const campaign: CampaignContext = {
    campaignId: asString(ctx.CampaignId),
    campaignName: asString(ctx.CampaignName),
    actionId: asString(ctx.ActionId),
    runId: asString(ctx.RunId),
  };
  return Object.values(campaign).some((v) => v !== undefined)
    ? campaign
    : undefined;
};

/**
 * Resolve the push title/body to deliver to ONE profile, honoring the journey
 * author's per-profile copy.
 *
 * Precedence (highest first):
 *   1. the profile's own `CustomerData.messageTitle` / `CustomerData.messageBody`
 *      (case-sensitive, exactly as delivered by the Connect Journey
 *      Custom-action) — the copy the journey author configured for this profile;
 *   2. the `eventMessage` fallback passed by the caller (e.g. copy rendered from
 *      a Q in Connect message template at runtime, or the batch defaults);
 *   3. the {@link DEFAULT_PUSH_TITLE} / {@link DEFAULT_PUSH_BODY} constants.
 *
 * `eventMessage` always has defaults applied, so title/body are non-empty here;
 * any `data` bag is carried through unchanged. Each field's origin is reported
 * via `titleSource` / `bodySource` for per-profile observability.
 */
export const resolveProfileMessage = (
  target: ProfileTarget,
  eventMessage: PushMessage,
): ResolvedProfileMessage => {
  const cd = target.customerData;
  const cdTitle = cd ? asString(cd[CUSTOMER_DATA_TITLE_KEY]) : undefined;
  const cdBody = cd ? asString(cd[CUSTOMER_DATA_BODY_KEY]) : undefined;

  const title = cdTitle ?? eventMessage.title;
  const body = cdBody ?? eventMessage.body;

  const titleSource: MessageSource = cdTitle
    ? 'customerData'
    : eventMessage.title === DEFAULT_PUSH_TITLE
      ? 'default'
      : 'event';
  const bodySource: MessageSource = cdBody
    ? 'customerData'
    : eventMessage.body === DEFAULT_PUSH_BODY
      ? 'default'
      : 'event';

  const message: PushMessage = eventMessage.data
    ? { title, body, data: eventMessage.data }
    : { title, body };

  return { message, titleSource, bodySource };
};
