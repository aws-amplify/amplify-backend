// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../constants.js';
import { ParsedPushEvent, ProfileTarget, PushMessage } from './push_types.js';

/**
 * Parse a raw Connect Journey Custom-action event into a flat list of profile
 * targets plus the message to deliver.
 *
 * DEFENSIVE / batch-aware. The exact Journey Custom-action envelope for the
 * outbound-campaigns batch is not publicly documented, so this accepts the
 * documented batch shape AND the common variants (so a Connect segment batch,
 * a single-profile invoke, and a direct test invoke all work):
 *
 *   1. Batch:   { Items: [ { CustomerProfiles: [ { ProfileId, CustomerData } ] } ] }
 *   2. Flat:    { CustomerProfiles: [ { ProfileId, CustomerData } ] }
 *   3. Single:  { ProfileId, CustomerData? }  (or lowercase `profileId`)
 *
 * Message content is sourced from an event-level `Message` / `message` object
 * ({ Title/title, Body/body, Data/data }) or top-level `title`/`body`, and
 * falls back to sensible defaults.
 *
 * Keys are matched case-insensitively for `ProfileId` / `CustomerProfiles` /
 * `CustomerData` so minor envelope differences don't drop targets.
 */
export const parsePushEvent = (event: unknown): ParsedPushEvent => {
  const root = isRecord(event) ? event : {};
  return {
    targets: extractTargets(root),
    message: extractMessage(root),
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

const extractTargets = (root: Record<string, unknown>): ProfileTarget[] => {
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
      const customerData = pick(entry, 'CustomerData', 'customerData');
      targets.push({
        profileId,
        customerData: isRecord(customerData) ? customerData : undefined,
      });
    }
  };

  // 1. Batch shape: { Items: [ { CustomerProfiles: [...] } ] }
  const items = pick(root, 'Items', 'items');
  if (Array.isArray(items)) {
    for (const item of items) {
      if (isRecord(item)) {
        addFromCustomerProfiles(
          pick(item, 'CustomerProfiles', 'customerProfiles'),
        );
      }
    }
  }

  // 2. Flat shape: { CustomerProfiles: [...] }
  addFromCustomerProfiles(pick(root, 'CustomerProfiles', 'customerProfiles'));

  // 3. Single-profile / direct-invoke shape: { ProfileId, CustomerData? }
  if (targets.length === 0) {
    const profileId = asString(pick(root, 'ProfileId', 'profileId'));
    if (profileId) {
      const customerData = pick(root, 'CustomerData', 'customerData');
      targets.push({
        profileId,
        customerData: isRecord(customerData) ? customerData : undefined,
      });
    }
  }

  return targets;
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
