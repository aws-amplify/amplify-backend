// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parsePushEvent, resolveProfileMessage } from './push_event.js';
import { DEFAULT_PUSH_BODY, DEFAULT_PUSH_TITLE } from '../constants.js';
import { PushMessage } from './push_types.js';

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

void describe('parsePushEvent — parsePath', () => {
  void it('reports batch for the Items[].CustomerProfiles[] shape', () => {
    assert.strictEqual(
      parsePushEvent({ Items: [{ CustomerProfiles: [{ ProfileId: 'p1' }] }] })
        .parsePath,
      'batch',
    );
  });

  void it('reports flat for a top-level CustomerProfiles array', () => {
    assert.strictEqual(
      parsePushEvent({ CustomerProfiles: [{ ProfileId: 'p1' }] }).parsePath,
      'flat',
    );
  });

  void it('reports single for a bare ProfileId shape', () => {
    assert.strictEqual(
      parsePushEvent({ ProfileId: 'solo' }).parsePath,
      'single',
    );
  });

  void it('reports none when no targets are resolvable', () => {
    assert.strictEqual(parsePushEvent({}).parsePath, 'none');
    assert.strictEqual(parsePushEvent(undefined).parsePath, 'none');
    assert.strictEqual(
      parsePushEvent({ CustomerProfiles: [{ CustomerData: {} }] }).parsePath,
      'none',
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

void describe('resolveProfileMessage — per-profile CustomerData copy', () => {
  const DEFAULTS: PushMessage = {
    title: DEFAULT_PUSH_TITLE,
    body: DEFAULT_PUSH_BODY,
  };

  void it("uses the profile's CustomerData.messageTitle / messageBody when present", () => {
    const resolved = resolveProfileMessage(
      {
        profileId: 'eb155c66aae14a10b775437c40a4e44d',
        customerData: {
          FirstName: 'Manual',
          LastName: 'Tester',
          Attributes: { cognitoSub: 'sub-123' },
          messageTitle: 'Manual Journey Push',
          messageBody:
            'Sent via Connect Journey custom action (manual-test re-seed)',
        },
      },
      DEFAULTS,
    );
    assert.strictEqual(resolved.message.title, 'Manual Journey Push');
    assert.strictEqual(
      resolved.message.body,
      'Sent via Connect Journey custom action (manual-test re-seed)',
    );
    assert.strictEqual(resolved.titleSource, 'customerData');
    assert.strictEqual(resolved.bodySource, 'customerData');
  });

  void it('CustomerData copy overrides an event-level message', () => {
    const resolved = resolveProfileMessage(
      {
        profileId: 'p1',
        customerData: { messageTitle: 'CD Title', messageBody: 'CD Body' },
      },
      { title: 'Event Title', body: 'Event Body' },
    );
    assert.strictEqual(resolved.message.title, 'CD Title');
    assert.strictEqual(resolved.message.body, 'CD Body');
    assert.strictEqual(resolved.titleSource, 'customerData');
    assert.strictEqual(resolved.bodySource, 'customerData');
  });

  void it('falls back to the event-level message when CustomerData has no copy', () => {
    const resolved = resolveProfileMessage(
      { profileId: 'p1', customerData: { FirstName: 'Manual' } },
      { title: 'Event Title', body: 'Event Body' },
    );
    assert.strictEqual(resolved.message.title, 'Event Title');
    assert.strictEqual(resolved.message.body, 'Event Body');
    assert.strictEqual(resolved.titleSource, 'event');
    assert.strictEqual(resolved.bodySource, 'event');
  });

  void it('falls back to defaults when neither CustomerData nor event provide copy', () => {
    const resolved = resolveProfileMessage({ profileId: 'p1' }, DEFAULTS);
    assert.strictEqual(resolved.message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(resolved.message.body, DEFAULT_PUSH_BODY);
    assert.strictEqual(resolved.titleSource, 'default');
    assert.strictEqual(resolved.bodySource, 'default');
  });

  void it('resolves title and body independently (one from CustomerData, one from event)', () => {
    const resolved = resolveProfileMessage(
      { profileId: 'p1', customerData: { messageTitle: 'CD Title' } },
      { title: 'Event Title', body: 'Event Body' },
    );
    assert.strictEqual(resolved.message.title, 'CD Title');
    assert.strictEqual(resolved.message.body, 'Event Body');
    assert.strictEqual(resolved.titleSource, 'customerData');
    assert.strictEqual(resolved.bodySource, 'event');
  });

  void it('ignores empty-string CustomerData copy (falls through to event/default)', () => {
    const resolved = resolveProfileMessage(
      { profileId: 'p1', customerData: { messageTitle: '', messageBody: '' } },
      DEFAULTS,
    );
    assert.strictEqual(resolved.message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(resolved.message.body, DEFAULT_PUSH_BODY);
    assert.strictEqual(resolved.titleSource, 'default');
    assert.strictEqual(resolved.bodySource, 'default');
  });

  void it('matches the CustomerData keys case-sensitively (MessageTitle is NOT messageTitle)', () => {
    const resolved = resolveProfileMessage(
      { profileId: 'p1', customerData: { MessageTitle: 'Wrong Case' } },
      DEFAULTS,
    );
    assert.strictEqual(resolved.message.title, DEFAULT_PUSH_TITLE);
    assert.strictEqual(resolved.titleSource, 'default');
  });

  void it('carries the event-level data bag through unchanged', () => {
    const resolved = resolveProfileMessage(
      { profileId: 'p1', customerData: { messageTitle: 'CD Title' } },
      { title: 'Event', body: 'Body', data: { k: 'v' } },
    );
    assert.deepStrictEqual(resolved.message.data, { k: 'v' });
  });
});
