// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { MAX_ATTRIBUTE_LENGTH } from '../../constants.js';
import { RESERVED_ATTRIBUTE_KEYS } from '../../object_types.js';
import { UserProfile } from './types.js';

/** A standard Customer Profiles address (subset used by this backend). */
export type ProfileAddress = {
  city?: string;
  country?: string;
  postalCode?: string;
  province?: string;
};

/** Person data mapped to UpdateProfile standard fields + Attributes map. */
export type ProfileUpdate = {
  emailAddress?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  address?: ProfileAddress;
  attributes: Record<string, string>;
};

/**
 * Split a full name into first / last on the first space. A single token is the
 * first name with no last name.
 */
export const splitName = (
  name: string,
): { firstName: string; lastName?: string } => {
  const trimmed = name.trim();
  const idx = trimmed.indexOf(' ');
  if (idx === -1) {
    return { firstName: trimmed };
  }
  return {
    firstName: trimmed.slice(0, idx),
    lastName: trimmed.slice(idx + 1).trim() || undefined,
  };
};

/** Drop keys whose value is undefined/null/empty. */
const compact = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== '') {
      out[k] = v;
    }
  }
  return out as Partial<T>;
};

/**
 * Build the UpdateProfile payload (standard fields + Attributes map) from the
 * customer-supplied `userProfile`.
 *
 * Standard fields: email -> EmailAddress, name -> First/LastName (splitName),
 * phone -> PhoneNumber, location -> Address{City, Country, PostalCode,
 * Province<-region}. `Attributes` is EXACTLY `{ ...customAttributes }` — the
 * backend derives NO attributes (no appUserId, no hasAPNS/hasGCM, no
 * plan/locale/platform/demographic/metrics). Segmentation attributes are the
 * customer's responsibility via `customAttributes`. Attribute values are capped
 * at the Customer Profiles length limit.
 */
export const buildProfileUpdate = (userProfile: UserProfile): ProfileUpdate => {
  const profile = userProfile ?? {};
  const location = profile.location;
  const name = profile.name ? splitName(profile.name) : undefined;

  const attributes: Record<string, string> = {};
  if (profile.customAttributes) {
    for (const [key, value] of Object.entries(profile.customAttributes)) {
      if (RESERVED_ATTRIBUTE_KEYS.has(key)) {
        continue;
      }
      if (typeof value === 'string' && value.length > 0) {
        attributes[key] = value.slice(0, MAX_ATTRIBUTE_LENGTH);
      }
    }
  }

  const address = compact({
    city: location?.city,
    country: location?.country,
    postalCode: location?.postalCode,
    province: location?.region,
  }) as ProfileAddress;

  return {
    emailAddress: profile.email,
    phoneNumber: profile.phone,
    firstName: name?.firstName,
    lastName: name?.lastName,
    address: Object.keys(address).length > 0 ? address : undefined,
    attributes,
  };
};
