import { describe, it } from 'node:test';
import assert from 'node:assert';
import * as fs from 'node:fs';
import path from 'path';
import { UserAgentProvider } from './user_agent_provider';
import { ConversationTurnEvent } from './types';

void describe('User Agent provider', () => {
  // Read package json from disk (i.e., in a different way than actual implementation does).
  const packageVersion = JSON.parse(
    fs.readFileSync(
      path.resolve(__dirname, '..', '..', '..', 'package.json'),
      'utf-8'
    )
  ).version;

  void it('adds package information as metadata when user agent is present in the event', () => {
    const userAgentProvider = new UserAgentProvider({
      request: {
        headers: {
          'x-amz-user-agent': 'lib/foo#1.2.3',
        },
      },
    } as unknown as ConversationTurnEvent);

    const userAgent = userAgentProvider.getUserAgent();

    assert.strictEqual(
      userAgent,
      `lib/foo#1.2.3 md/amplify-ai-constructs#${packageVersion}`
    );
  });

  void it('adds package information as lib when user agent is not present in the event', () => {
    const userAgentProvider = new UserAgentProvider({
      request: {
        headers: {},
      },
    } as unknown as ConversationTurnEvent);

    const userAgent = userAgentProvider.getUserAgent();

    assert.strictEqual(
      userAgent,
      `lib/amplify-ai-constructs#${packageVersion}`
    );
  });

  void it('adds additional metadata', () => {
    const userAgentProvider = new UserAgentProvider({
      request: {
        headers: {},
      },
    } as unknown as ConversationTurnEvent);

    const userAgent = userAgentProvider.getUserAgent({
      metadata1: 'value1',
      metadata2: 'value2',
    });

    assert.strictEqual(
      userAgent,
      `lib/amplify-ai-constructs#${packageVersion} md/metadata1#value1 md/metadata2#value2`
    );
  });

  void it('throws on invalid metadata key', () => {
    const userAgentProvider = new UserAgentProvider({
      request: {
        headers: {},
      },
    } as unknown as ConversationTurnEvent);

    assert.throws(() =>
      userAgentProvider.getUserAgent({
        'invalid metadata key': 'value1',
      })
    );
  });

  void it('throws on invalid metadata value', () => {
    const userAgentProvider = new UserAgentProvider({
      request: {
        headers: {},
      },
    } as unknown as ConversationTurnEvent);

    assert.throws(() =>
      userAgentProvider.getUserAgent({
        metadata: 'invalid metadata value',
      })
    );
  });
});
