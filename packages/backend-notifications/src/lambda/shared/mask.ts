// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Mask a push device token for logging, keeping only the last 6 characters.
 *
 * Push tokens are sensitive routing identifiers, so they must never be logged
 * in full. This keeps just enough of the tail to correlate log lines for the
 * same device while diagnosing delivery.
 *
 * NOTE: this is a diagnostic-grade mask for the current PoC/observability pass.
 * Before production, tokens should be FULLY masked (or omitted / hashed)
 * rather than exposing the trailing characters.
 */
export const maskToken = (token: string | undefined): string => {
  if (!token) {
    return '(none)';
  }
  return token.length <= 6 ? '***' : `***${token.slice(-6)}`;
};
