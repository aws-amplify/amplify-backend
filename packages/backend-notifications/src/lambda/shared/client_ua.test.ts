// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import {
  getInboundUserAgent,
  setInboundUserAgent,
  withInboundUserAgent,
} from './client_ua.js';

afterEach(() => {
  setInboundUserAgent(undefined);
});

void describe('setInboundUserAgent', () => {
  void it('parses a multi-token Amplify client user agent into pairs', () => {
    setInboundUserAgent('aws-amplify/6.15.4 analytics/2 framework/1');
    assert.deepStrictEqual(getInboundUserAgent(), [
      ['aws-amplify', '6.15.4'],
      ['analytics', '2'],
      ['framework', '1'],
    ]);
  });

  void it('treats a token without a slash as a name with an empty version', () => {
    setInboundUserAgent('aws-amplify/6.15.4 standalone');
    assert.deepStrictEqual(getInboundUserAgent(), [
      ['aws-amplify', '6.15.4'],
      ['standalone', ''],
    ]);
  });

  void it('splits on the FIRST slash, so a version keeps the remainder of the token', () => {
    // The SDK escapes `/` inside a version to `-` before it reaches the wire, so
    // this asserts the parser boundary, not the final header value.
    setInboundUserAgent('framework/react-native/0.74');
    assert.deepStrictEqual(getInboundUserAgent(), [
      ['framework', 'react-native/0.74'],
    ]);
  });

  void it('caps the number of propagated pairs at 6', () => {
    setInboundUserAgent('a/1 b/2 c/3 d/4 e/5 f/6 g/7 h/8');
    const pairs = getInboundUserAgent();
    assert.strictEqual(pairs.length, 6);
    assert.deepStrictEqual(pairs.at(-1), ['f', '6']);
    assert.ok(
      !pairs.some(([name]) => name === 'g' || name === 'h'),
      'tokens beyond the cap must be dropped',
    );
  });

  void it('truncates an overlong name and version to 64 characters', () => {
    const longName = 'n'.repeat(100);
    const longVersion = 'v'.repeat(100);
    setInboundUserAgent(`${longName}/${longVersion}`);
    const [[name, version]] = getInboundUserAgent();
    assert.strictEqual(name.length, 64);
    assert.strictEqual(version.length, 64);
    assert.strictEqual(name, 'n'.repeat(64));
    assert.strictEqual(version, 'v'.repeat(64));
  });

  void it('collapses arbitrary spacing and ignores empty tokens', () => {
    setInboundUserAgent('  aws-amplify/6.15.4 \t\n  analytics/2   ');
    assert.deepStrictEqual(getInboundUserAgent(), [
      ['aws-amplify', '6.15.4'],
      ['analytics', '2'],
    ]);
  });

  void it('yields no pairs for undefined or empty input', () => {
    setInboundUserAgent(undefined);
    assert.deepStrictEqual(getInboundUserAgent(), []);
    setInboundUserAgent('');
    assert.deepStrictEqual(getInboundUserAgent(), []);
    setInboundUserAgent('   ');
    assert.deepStrictEqual(getInboundUserAgent(), []);
  });

  void it('RESETS on every call so a later request never inherits an earlier user agent', () => {
    setInboundUserAgent('aws-amplify/6.15.4');
    assert.strictEqual(getInboundUserAgent().length, 1);
    setInboundUserAgent(undefined);
    assert.deepStrictEqual(
      getInboundUserAgent(),
      [],
      'a user-agent-less request must not inherit the previous caller',
    );
    setInboundUserAgent('other/1');
    assert.deepStrictEqual(getInboundUserAgent(), [['other', '1']]);
  });

  void it('returns a copy so callers cannot mutate the staged pairs', () => {
    setInboundUserAgent('aws-amplify/6.15.4');
    const first = getInboundUserAgent();
    first[0][0] = 'tampered';
    first.push(['injected', '1']);
    assert.deepStrictEqual(getInboundUserAgent(), [['aws-amplify', '6.15.4']]);
  });
});

void describe('withInboundUserAgent', () => {
  /** Minimal stand-in for the one `middlewareStack.add` overload used. */
  const fakeClient = (): {
    middlewareStack: {
      add: (middleware: unknown, options: unknown) => void;
      added: Array<{ middleware: unknown; options: unknown }>;
    };
    marker: string;
  } => {
    const added: Array<{ middleware: unknown; options: unknown }> = [];
    return {
      middlewareStack: {
        add: (middleware: unknown, options: unknown) => {
          added.push({ middleware, options });
        },
        added,
      },
      marker: 'the-same-client',
    };
  };

  void it('registers exactly one override-flagged build-step middleware and returns the client', () => {
    const client = fakeClient();
    const returned = withInboundUserAgent(client);
    assert.strictEqual(returned, client, 'must return the same instance');
    assert.strictEqual(client.middlewareStack.added.length, 1);
    assert.deepStrictEqual(client.middlewareStack.added[0].options, {
      step: 'build',
      name: 'amplify-inbound-user-agent-propagator',
      override: true,
    });
  });

  void it('appends the staged pairs to context.userAgent, preserving existing entries', async () => {
    const client = fakeClient();
    withInboundUserAgent(client);
    const middleware = client.middlewareStack.added[0].middleware as (
      next: (args: unknown) => unknown,
      context: { userAgent?: Array<[string, string]> },
    ) => (args: unknown) => unknown;

    setInboundUserAgent('aws-amplify/6.15.4 analytics/2');
    const context: { userAgent?: Array<[string, string]> } = {
      userAgent: [['amplify-backend-notifications', '0.1.0']],
    };
    let passedThrough: unknown;
    const handler = middleware((args) => {
      passedThrough = args;
      return 'result';
    }, context);

    const result = await handler({ request: {} });

    assert.strictEqual(result, 'result', 'must return next()');
    assert.deepStrictEqual(passedThrough, { request: {} });
    assert.deepStrictEqual(context.userAgent, [
      ['amplify-backend-notifications', '0.1.0'],
      ['aws-amplify', '6.15.4'],
      ['analytics', '2'],
    ]);
  });

  void it('adds nothing when there is no inbound user agent', async () => {
    const client = fakeClient();
    withInboundUserAgent(client);
    const middleware = client.middlewareStack.added[0].middleware as (
      next: (args: unknown) => unknown,
      context: { userAgent?: Array<[string, string]> },
    ) => (args: unknown) => unknown;

    setInboundUserAgent(undefined);
    const context: { userAgent?: Array<[string, string]> } = {
      userAgent: [['amplify-backend-notifications', '0.1.0']],
    };
    await middleware(() => undefined, context)({});

    assert.deepStrictEqual(context.userAgent, [
      ['amplify-backend-notifications', '0.1.0'],
    ]);
  });

  void it('throws immediately when handed something that is not an SDK client', () => {
    // The middleware-stack shape cannot be checked by the compiler, so a shape
    // change must fail loudly at module load rather than mid-request.
    assert.throws(
      () => withInboundUserAgent({ middlewareStack: {} }),
      /no middlewareStack\.add/,
    );
    assert.throws(
      () => withInboundUserAgent({ middlewareStack: undefined }),
      /no middlewareStack\.add/,
    );
  });

  void it('handles a context with no userAgent yet', async () => {
    const client = fakeClient();
    withInboundUserAgent(client);
    const middleware = client.middlewareStack.added[0].middleware as (
      next: (args: unknown) => unknown,
      context: { userAgent?: Array<[string, string]> },
    ) => (args: unknown) => unknown;

    setInboundUserAgent('aws-amplify/6.15.4');
    const context: { userAgent?: Array<[string, string]> } = {};
    await middleware(() => undefined, context)({});

    assert.deepStrictEqual(context.userAgent, [['aws-amplify', '6.15.4']]);
  });
});
