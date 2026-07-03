// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import {
  CUSTOMER_DATA_BODY_KEY,
  CUSTOMER_DATA_TITLE_KEY,
  DEFAULT_PUSH_BODY,
  DEFAULT_PUSH_TITLE,
} from '../constants.js';
import {
  CampaignContext,
  MessageSource,
  ParsedPushEvent,
  ProfileTarget,
  PushEventParsePath,
  PushMessage,
  ResolvedProfileMessage,
} from './push_types.js';

/**
 * Parse a raw Connect Journey Custom-action event into a flat list of profile
 * targets plus the message to deliver.
 *
 * PRIMARY (real) shape — the Amazon Connect Outbound Campaigns v2 journey
 * invocation, confirmed from a live journey run (RequestId
 * 78da5698-8f31-4662-bf7b-d69502347fde):
 *
 *   {
 *     InvocationMetadata: { CampaignContext: { CampaignId, RunId, ActionId, CampaignName } },
 *     Items: { CustomerProfiles: [ { ProfileId, CustomerData, IdempotencyToken }, ... ] }
 *   }
 *
 * Note the real shape's quirks, all handled here:
 *   - `Items` is an OBJECT `{ CustomerProfiles: [...] }`, NOT an array;
 *   - each entry's `CustomerData` is a SERIALIZED JSON STRING (camelCase keys:
 *     `profileId`, `firstName`, `lastName`, `emailAddress`, `address`,
 *     `attributes.*`) that must be `JSON.parse`d;
 *   - `ProfileId` is top-level PascalCase on each entry (used for device
 *     lookup) and there is an `IdempotencyToken`;
 *   - there is NO `messageTitle` / `messageBody` — message copy falls back to
 *     the event-level / default copy (message sourcing by campaign is a
 *     separate, not-yet-implemented feature).
 *
 * BACKWARD COMPATIBILITY — earlier hand-crafted / direct-invoke shapes still parse:
 *   1. Batch (Items ARRAY): { Items: [ { CustomerProfiles: [ { ProfileId, CustomerData } ] } ] }
 *   2. Flat:                { CustomerProfiles: [ { ProfileId, CustomerData } ] }
 *   3. Single:              { ProfileId, CustomerData? }  (or lowercase `profileId`)
 * and `CustomerData` may be a plain object (PascalCase or camelCase) rather
 * than a serialized string.
 *
 * Message content is sourced from an event-level `Message` / `message` object
 * ({ Title/title, Body/body, Data/data }) or top-level `title`/`body`, and
 * falls back to sensible defaults.
 *
 * Keys are matched case-insensitively for `ProfileId` / `CustomerProfiles` /
 * `CustomerData` / `Items` so minor envelope differences don't drop targets.
 */
export const parsePushEvent = (event: unknown): ParsedPushEvent => {
  const root = isRecord(event) ? event : {};
  const { targets, parsePath } = extractTargets(root);
  const campaign = extractCampaign(root);
  return {
    targets,
    message: extractMessage(root),
    parsePath,
    ...(campaign ? { campaign } : {}),
  };
};

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Case-insensitive property lookup. */
const pick = (obj: Record<string, unknown>, ...names: string[]): unknown => {
  for (const name of names) {
    if (obj[name] !== undefined) {
      return obj[name];
    }
  }
  const lowered = names.map((n) => n.toLowerCase());
  for (const [key, value] of Object.entries(obj)) {
    if (lowered.includes(key.toLowerCase())) {
      return value;
    }
  }
  return undefined;
};

const asString = (v: unknown): string | undefined =>
  typeof v === 'string' && v.length > 0 ? v : undefined;

const extractTargets = (
  root: Record<string, unknown>,
): { targets: ProfileTarget[]; parsePath: PushEventParsePath } => {
  const targets: ProfileTarget[] = [];

  const addFromCustomerProfiles = (value: unknown): void => {
    if (!Array.isArray(value)) {
      return;
    }
    for (const entry of value) {
      if (!isRecord(entry)) {
        continue;
      }
      const profileId = asString(pick(entry, 'ProfileId', 'profileId'));
      if (!profileId) {
        continue;
      }
      targets.push({
        profileId,
        customerData: coerceCustomerData(
          pick(entry, 'CustomerData', 'customerData'),
        ),
      });
    }
  };

  // 1. Batch shape. PRIMARY (real journey): `Items` is an OBJECT
  //    { CustomerProfiles: [...] }. BACKWARD COMPATIBILITY: `Items` is an ARRAY of
  //    { CustomerProfiles: [...] }. Normalize both to a list of item records.
  const items = pick(root, 'Items', 'items');
  const itemList: unknown[] = Array.isArray(items)
    ? items
    : isRecord(items)
      ? [items]
      : [];
  for (const item of itemList) {
    if (isRecord(item)) {
      addFromCustomerProfiles(
        pick(item, 'CustomerProfiles', 'customerProfiles'),
      );
    }
  }
  const batchCount = targets.length;

  // 2. Flat shape: { CustomerProfiles: [...] }
  addFromCustomerProfiles(pick(root, 'CustomerProfiles', 'customerProfiles'));
  const flatCount = targets.length - batchCount;

  // 3. Single-profile / direct-invoke shape: { ProfileId, CustomerData? }
  if (targets.length === 0) {
    const profileId = asString(pick(root, 'ProfileId', 'profileId'));
    if (profileId) {
      targets.push({
        profileId,
        customerData: coerceCustomerData(
          pick(root, 'CustomerData', 'customerData'),
        ),
      });
    }
  }

  const parsePath: PushEventParsePath =
    batchCount > 0
      ? 'batch'
      : flatCount > 0
        ? 'flat'
        : targets.length > 0
          ? 'single'
          : 'none';

  return { targets, parsePath };
};

/**
 * Coerce a raw `CustomerData` value into a property bag.
 *
 * The real Connect journey delivers `CustomerData` as a SERIALIZED JSON STRING
 * (camelCase keys), so a string is `JSON.parse`d. Backward compatibility: a plain
 * object (PascalCase or camelCase, from earlier hand-crafted / direct-invoke
 * payloads) is used as-is. Anything else — or a string that isn't valid JSON,
 * or JSON that isn't an object — yields `undefined` so a malformed entry never
 * aborts the batch.
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
  const meta = pick(root, 'InvocationMetadata', 'invocationMetadata');
  if (!isRecord(meta)) {
    return undefined;
  }
  const ctx = pick(meta, 'CampaignContext', 'campaignContext');
  if (!isRecord(ctx)) {
    return undefined;
  }
  const campaign: CampaignContext = {
    campaignId: asString(pick(ctx, 'CampaignId', 'campaignId')),
    campaignName: asString(pick(ctx, 'CampaignName', 'campaignName')),
    actionId: asString(pick(ctx, 'ActionId', 'actionId')),
    runId: asString(pick(ctx, 'RunId', 'runId')),
  };
  return Object.values(campaign).some((v) => v !== undefined)
    ? campaign
    : undefined;
};

const extractMessage = (root: Record<string, unknown>): PushMessage => {
  const messageObj = pick(root, 'Message', 'message');
  const container = isRecord(messageObj) ? messageObj : root;

  const title =
    asString(pick(container, 'Title', 'title')) ?? DEFAULT_PUSH_TITLE;
  const body = asString(pick(container, 'Body', 'body')) ?? DEFAULT_PUSH_BODY;

  const rawData = pick(container, 'Data', 'data');
  const data = coerceData(rawData);

  return data ? { title, body, data } : { title, body };
};

/**
 * Resolve the push title/body to deliver to ONE profile, honoring the journey
 * author's per-profile copy.
 *
 * Precedence (highest first):
 *   1. the profile's own `CustomerData.messageTitle` / `CustomerData.messageBody`
 *      (case-sensitive, exactly as delivered by the Connect Journey
 *      Custom-action) — the copy the journey author configured for this profile;
 *   2. the event-level fallback captured in `eventMessage` (sourced from a
 *      `Message`/`message` object or top-level `title`/`body`);
 *   3. the {@link DEFAULT_PUSH_TITLE} / {@link DEFAULT_PUSH_BODY} constants.
 *
 * `eventMessage` is the batch-level {@link ParsedPushEvent.message} (defaults
 * already applied), so title/body are always non-empty here; any `data` bag is
 * carried through unchanged. Each field's origin is reported via
 * `titleSource` / `bodySource` for per-profile observability.
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

/** Coerce an arbitrary data bag into a `Record<string, string>`. */
const coerceData = (raw: unknown): Record<string, string> | undefined => {
  if (!isRecord(raw)) {
    return undefined;
  }
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined || value === null) {
      continue;
    }
    out[key] = typeof value === 'string' ? value : JSON.stringify(value);
  }
  return Object.keys(out).length > 0 ? out : undefined;
};
