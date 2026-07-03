// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePushEvent } from './push_event.js';
import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../constants.js';

void describe('parsePushEvent — targets', () => {
  void it('parses the documented Journey batch shape (Items[].CustomerProfiles[])', () => {
    const event = {
      Items: [
        {
          CustomerProfiles: [
            { ProfileId: 'p1', CustomerData: { plan: 'premium' } },
            { ProfileId: 'p2' },
          ],
        },
        {
          CustomerProfiles: [{ ProfileId: 'p3' }],
        },
      ],
    };
    const { targets } = parsePushEvent(event);
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['p1', 'p2', 'p3'],
    );
    assert.deepStrictEqual(targets[0].customerData, { plan: 'premium' });
    assert.strictEqual(targets[1].customerData, undefined);
  });

  void it('parses a flat CustomerProfiles array (no Items wrapper)', () => {
    const { targets } = parsePushEvent({
      CustomerProfiles: [{ ProfileId: 'p1' }, { ProfileId: 'p2' }],
    });
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['p1', 'p2'],
    );
  });

  void it('parses a single-profile / direct-invoke shape', () => {
    const { targets } = parsePushEvent({
      ProfileId: 'solo',
      CustomerData: { a: 1 },
    });
    assert.strictEqual(targets.length, 1);
    assert.strictEqual(targets[0].profileId, 'solo');
  });

  void it('matches keys case-insensitively (profileId / customerProfiles)', () => {
    const { targets } = parsePushEvent({
      items: [{ customerProfiles: [{ profileId: 'lc1' }] }],
    });
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['lc1'],
    );
  });

  void it('skips entries with no ProfileId and ignores malformed input', () => {
    assert.deepStrictEqual(parsePushEvent(undefined).targets, []);
    assert.deepStrictEqual(parsePushEvent('nope').targets, []);
    const { targets } = parsePushEvent({
      CustomerProfiles: [{ CustomerData: {} }, { ProfileId: '' }, 42],
    });
    assert.deepStrictEqual(targets, []);
  });

  void it('does not double-count when both Items and top-level exist (batch takes precedence)', () => {
    const { targets } = parsePushEvent({
      Items: [{ CustomerProfiles: [{ ProfileId: 'batch' }] }],
    });
    // Single fallback only triggers when zero targets found from arrays.
    assert.deepStrictEqual(
      targets.map((t) => t.profileId),
      ['batch'],
    );
  });
});

void describe('parsePushEvent — message', () => {
  void it('defaults title/body when none provided', () => {
    const { message } = parsePushEvent({ ProfileId: 'p1' });
    assert.strictEqual(message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(message.body, DEFAULT_PUSH_BODY);
    assert.strictEqual(message.data, undefined);
  });

  void it('sources title/body from an event-level Message object', () => {
    const { message } = parsePushEvent({
      ProfileId: 'p1',
      Message: { Title: 'Hi', Body: 'There', Data: { k: 'v', n: 3 } },
    });
    assert.strictEqual(message.title, 'Hi');
    assert.strictEqual(message.body, 'There');
    assert.deepStrictEqual(message.data, { k: 'v', n: '3' });
  });

  void it('sources title/body from lowercase top-level fields', () => {
    const { message } = parsePushEvent({
      ProfileId: 'p1',
      title: 'Lower',
      body: 'Case',
    });
    assert.strictEqual(message.title, 'Lower');
    assert.strictEqual(message.body, 'Case');
  });
});
