// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { type WriteEvent, resolvePrincipal } from './principal.js';

const eventWith = (cognitoIdentityId: unknown): WriteEvent =>
  ({
    requestContext: {
      identity: { cognitoIdentityId: cognitoIdentityId as string },
    },
  }) as WriteEvent;

void describe('resolvePrincipal', () => {
  void it('returns the SigV4-verified cognitoIdentityId as the principalId', () => {
    assert.strictEqual(
      resolvePrincipal(eventWith('us-east-1:abc-123')),
      'us-east-1:abc-123',
    );
  });

  void it('treats an authenticated and an unauthenticated identityId identically (no branching)', () => {
    // A guest is just an unauthenticated identityId — same field, same result.
    assert.strictEqual(
      resolvePrincipal(eventWith('us-east-1:guest-xyz')),
      'us-east-1:guest-xyz',
    );
  });

  void it('returns undefined when the identity block is absent', () => {
    assert.strictEqual(resolvePrincipal({}), undefined);
    assert.strictEqual(resolvePrincipal({ requestContext: {} }), undefined);
    assert.strictEqual(
      resolvePrincipal({ requestContext: { identity: {} } }),
      undefined,
    );
  });

  void it('returns undefined for empty / non-string identityId', () => {
    assert.strictEqual(resolvePrincipal(eventWith('')), undefined);
    assert.strictEqual(resolvePrincipal(eventWith(null)), undefined);
    assert.strictEqual(resolvePrincipal(eventWith(123)), undefined);
  });
});
