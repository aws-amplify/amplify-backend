// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { ENV_DEBUG_LOG } from '../../constants.js';

/**
 * Whether verbose, PII-bearing diagnostic logging is enabled for this
 * invocation (gated by the {@link ENV_DEBUG_LOG} environment variable).
 *
 * DEFAULT-OFF: returns `true` ONLY when the variable is explicitly set to
 * `'true'` or `'1'`. The default (unset / anything else) keeps the verbose
 * diagnostics — the raw invocation event and the rendered per-profile message
 * copy — suppressed, so the standard log path never emits customer content.
 */
export const debugLoggingEnabled = (): boolean => {
  const value = process.env[ENV_DEBUG_LOG];
  return value === 'true' || value === '1';
};
