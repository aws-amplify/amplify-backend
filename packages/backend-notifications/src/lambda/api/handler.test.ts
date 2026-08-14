/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */
// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { Readable } from 'node:stream';
import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { classifyRoute, handler } from './handler.js';
import { WriteEvent } from '../shared/principal.js';
import {
  MERGING_REJECTED_MESSAGE,
  MERGING_UNVERIFIED_MESSAGE,
  clearMergingCache,
} from '../shared/merging_guard.js';
import { awsClientConfig } from '../shared/client_config.js';
import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';

const EXPECTED_USER_AGENT = awsClientConfig().customUserAgent;

/**
 * Read the version straight from package.json so the assertions below track the
 * real published version and never pin a major (a pinned major breaks the
 * changesets release PR, which bumps the package before CI runs).
 */
const PACKAGE_VERSION: string = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf-8'),
).version;

const OWN_USER_AGENT_TOKEN = `amplify-backend-notifications/${PACKAGE_VERSION}`;

const PRINCIPAL = 'us-east-1:principal-1';

const makeEvent = (
  resourcePath: string,
  body: unknown,
  cognitoIdentityId: string | undefined = PRINCIPAL,
): WriteEvent =>
  ({
    body: body === undefined ? undefined : JSON.stringify(body),
    requestContext: {
      resourcePath,
      httpMethod: 'POST',
      identity: cognitoIdentityId ? { cognitoIdentityId } : {},
    },
  }) as WriteEvent;

/** Records every SDK command the handler issued, keyed by command name. */
let profileCommands: any[];
let ddbCommands: any[];
/**
 * The `customUserAgent` resolved on the client that actually issued each call.
 * Captured from `this` inside the `send` mock, so it reflects the real
 * module-scope client construction rather than a re-read of the config object.
 */
let profileUserAgents: unknown[];
let ddbUserAgents: unknown[];

const installMocks = (opts?: {
  searchProfileId?: string | null;
  ddbSend?: (input: any, name: string) => unknown;
  profileSend?: (input: any, name: string) => unknown;
}): void => {
  profileCommands = [];
  ddbCommands = [];
  profileUserAgents = [];
  ddbUserAgents = [];
  mock.method(
    CustomerProfilesClient.prototype,
    'send',
    function (this: CustomerProfilesClient, command: any) {
      const name = command.constructor.name;
      profileUserAgents.push(this.config.customUserAgent);
      profileCommands.push({ name, input: command.input });
      if (opts?.profileSend) {
        // The hook may throw to simulate an SDK rejection, or return a value to
        // override the default; returning undefined falls through to defaults.
        const override = opts.profileSend(command.input, name);
        if (override !== undefined) {
          return Promise.resolve(override);
        }
      }
      if (name === 'SearchProfilesCommand') {
        const id =
          opts && 'searchProfileId' in opts
            ? opts.searchProfileId
            : 'profile-123';
        return Promise.resolve(
          id ? { Items: [{ ProfileId: id }] } : { Items: [] },
        );
      }
      return Promise.resolve({});
    },
  );
  mock.method(
    DynamoDBClient.prototype,
    'send',
    function (this: DynamoDBClient, command: any) {
      const name = command.constructor.name;
      ddbUserAgents.push(this.config.customUserAgent);
      ddbCommands.push({ name, input: command.input });
      if (opts?.ddbSend) {
        return Promise.resolve(opts.ddbSend(command.input, name));
      }
      return Promise.resolve({});
    },
  );
};

const named = (list: any[], name: string): any[] =>
  list.filter((c) => c.name === name);

void describe('classifyRoute', () => {
  void it('classifies each route from the resourcePath suffix', () => {
    assert.strictEqual(
      classifyRoute(makeEvent('/identify-user', {})),
      'identify-user',
    );
    assert.strictEqual(
      classifyRoute(makeEvent('/register-device', {})),
      'register-device',
    );
    assert.strictEqual(
      classifyRoute(makeEvent('/remove-device', {})),
      'remove-device',
    );
  });

  void it('returns undefined for an unknown path', () => {
    assert.strictEqual(classifyRoute(makeEvent('/nope', {})), undefined);
  });
});

void describe('write handler', () => {
  beforeEach(() => {
    process.env[ENV_DOMAIN_NAME] = 'Domain';
    process.env[ENV_DEVICES_TABLE_NAME] = 'Devices';
    // The merging verdict is cached at module scope, so it must be dropped
    // between cases or a verdict from one case leaks into the next.
    clearMergingCache();
    installMocks();
  });

  afterEach(() => {
    mock.restoreAll();
    delete process.env[ENV_DOMAIN_NAME];
    delete process.env[ENV_DEVICES_TABLE_NAME];
  });

  void it('returns 500 when required env vars are missing', async () => {
    delete process.env[ENV_DOMAIN_NAME];
    const res = await handler(makeEvent('/identify-user', { userProfile: {} }));
    assert.strictEqual(res.statusCode, 500);
  });

  void it('returns 404 for an unknown route', async () => {
    const res = await handler(makeEvent('/nope', {}));
    assert.strictEqual(res.statusCode, 404);
  });

  void it('returns 403 when the SigV4 identity is missing (never from body)', async () => {
    const event = {
      body: JSON.stringify({ userProfile: {} }),
      requestContext: {
        resourcePath: '/identify-user',
        httpMethod: 'POST',
        identity: {},
      },
    } as WriteEvent;
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 403);
  });

  void it('returns 400 on invalid JSON body', async () => {
    const event = {
      body: '{not json',
      requestContext: {
        resourcePath: '/identify-user',
        httpMethod: 'POST',
        identity: { cognitoIdentityId: PRINCIPAL },
      },
    } as WriteEvent;
    const res = await handler(event);
    assert.strictEqual(res.statusCode, 400);
  });

  void it('constructs both SDK clients with the Amplify custom user agent', async () => {
    // Drive one route per client so each module-scope client actually issues a
    // call, then assert the user agent resolved on the sending client itself.
    const identify = await handler(
      makeEvent('/identify-user', { userProfile: { email: 'a@b.co' } }),
    );
    assert.strictEqual(identify.statusCode, 200);
    const register = await handler(
      makeEvent('/register-device', {
        device: { deviceId: 'd1', token: 't1', channelType: 'APNS' },
      }),
    );
    assert.strictEqual(register.statusCode, 200);

    assert.ok(profileUserAgents.length > 0, 'CustomerProfilesClient was used');
    assert.ok(ddbUserAgents.length > 0, 'DynamoDBClient was used');
    assert.deepStrictEqual(EXPECTED_USER_AGENT, [
      ['amplify-backend-notifications', EXPECTED_USER_AGENT[0][1]],
    ]);
    for (const resolved of [...profileUserAgents, ...ddbUserAgents]) {
      assert.deepStrictEqual(resolved, EXPECTED_USER_AGENT);
    }
  });

  void it('identify-user: 400 on invalid payload', async () => {
    const res = await handler(makeEvent('/identify-user', { userProfile: 5 }));
    assert.strictEqual(res.statusCode, 400);
    assert.ok(JSON.parse(res.body).message);
  });

  void it('identify-user: resolves profile then UpdateProfile with mapped fields', async () => {
    const res = await handler(
      makeEvent('/identify-user', {
        userProfile: {
          email: 'ada@example.com',
          name: 'Ada Lovelace',
          location: { region: 'WA' },
          customAttributes: { plan: 'premium' },
        },
      }),
    );
    assert.strictEqual(res.statusCode, 200);
    assert.deepStrictEqual(JSON.parse(res.body), {});

    assert.strictEqual(
      named(profileCommands, 'PutProfileObjectCommand').length,
      1,
    );
    const update = named(profileCommands, 'UpdateProfileCommand')[0];
    assert.strictEqual(update.input.ProfileId, 'profile-123');
    assert.strictEqual(update.input.EmailAddress, 'ada@example.com');
    assert.strictEqual(update.input.FirstName, 'Ada');
    assert.strictEqual(update.input.Address.Province, 'WA');
    assert.deepStrictEqual(update.input.Attributes, { plan: 'premium' });
    // identify-user never touches the device store.
    assert.strictEqual(ddbCommands.length, 0);
  });

  void it('SECURITY: identify-user with caller A + customAttributes.principalId=B never lets B reach the profile', async () => {
    const CALLER_A = PRINCIPAL;
    const VICTIM_B = 'us-east-1:VICTIM';
    const res = await handler(
      makeEvent(
        '/identify-user',
        {
          userProfile: {
            email: 'ada@example.com',
            customAttributes: { principalId: VICTIM_B, tier: 'gold' },
          },
        },
        CALLER_A,
      ),
    );

    // The reserved-key guard rejects the request outright (400).
    assert.strictEqual(res.statusCode, 400);

    // No UpdateProfile is issued, so the attacker value B never lands in a
    // profile — the injected principalId cannot reach the routing slot.
    assert.strictEqual(
      named(profileCommands, 'UpdateProfileCommand').length,
      0,
      'a rejected identify-user must not issue any UpdateProfileCommand',
    );
  });

  void it('register-device: 400 on invalid device', async () => {
    const res = await handler(
      makeEvent('/register-device', { device: { token: 'x' } }),
    );
    assert.strictEqual(res.statusCode, 400);
  });

  void it('register-device: pure DDB write (NO profile resolution) keyed on principalId', async () => {
    const res = await handler(
      makeEvent('/register-device', {
        device: {
          token: 'tok-1',
          deviceId: 'dev-1',
          platform: 'iOS',
          appVersion: '1.0.0',
          channelType: 'APNS',
        },
      }),
    );
    assert.strictEqual(res.statusCode, 200);
    // NO Customer Profiles calls at all — register-device is a pure DDB write.
    assert.strictEqual(
      named(profileCommands, 'PutProfileObjectCommand').length,
      0,
    );
    assert.strictEqual(
      named(profileCommands, 'SearchProfilesCommand').length,
      0,
    );
    assert.strictEqual(
      named(profileCommands, 'UpdateProfileCommand').length,
      0,
    );

    const upsert = named(ddbCommands, 'UpdateItemCommand')[0];
    assert.deepStrictEqual(upsert.input.Key, { deviceId: { S: 'dev-1' } });
    assert.strictEqual(
      upsert.input.ExpressionAttributeValues[':principalId'].S,
      PRINCIPAL,
    );
    // No profileId is written to the device record anymore.
    assert.strictEqual(
      upsert.input.ExpressionAttributeValues[':profileId'],
      undefined,
    );
    assert.strictEqual(
      upsert.input.ExpressionAttributeValues[':token'].S,
      'tok-1',
    );
  });

  void it('SECURITY: body-supplied principalId/userId/identityId are IGNORED; ownership uses only the SigV4 requestContext identity', async () => {
    const res = await handler(
      makeEvent('/register-device', {
        // Attacker-controlled body fields that must NOT influence ownership.
        principalId: 'us-east-1:ATTACKER',
        userId: 'attacker-user',
        identityId: 'us-east-1:ATTACKER',
        device: {
          token: 'tok-1',
          deviceId: 'dev-1',
          channelType: 'APNS',
          // spoof attempts nested on the device entity too
          principalId: 'us-east-1:ATTACKER',
        },
      }),
    );
    assert.strictEqual(res.statusCode, 200);
    const upsert = named(ddbCommands, 'UpdateItemCommand')[0];
    // Ownership is the SigV4-derived principal, never any body value.
    assert.strictEqual(
      upsert.input.ExpressionAttributeValues[':principalId'].S,
      PRINCIPAL,
    );
    assert.notStrictEqual(
      upsert.input.ExpressionAttributeValues[':principalId'].S,
      'us-east-1:ATTACKER',
    );
  });

  void it('remove-device: conditional delete gated on principalId', async () => {
    const res = await handler(
      makeEvent('/remove-device', { deviceId: 'dev-1' }),
    );
    assert.strictEqual(res.statusCode, 200);
    const del = named(ddbCommands, 'DeleteItemCommand')[0];
    assert.deepStrictEqual(del.input.Key, { deviceId: { S: 'dev-1' } });
    assert.strictEqual(del.input.ConditionExpression, 'principalId = :caller');
    assert.strictEqual(
      del.input.ExpressionAttributeValues[':caller'].S,
      PRINCIPAL,
    );
  });

  void it('remove-device: idempotent 200 when ConditionalCheckFailed (not owner / absent)', async () => {
    mock.restoreAll();
    installMocks({
      ddbSend: (_input, name) => {
        if (name === 'DeleteItemCommand') {
          const err: any = new Error('condition failed');
          err.name = 'ConditionalCheckFailedException';
          throw err;
        }
        return {};
      },
    });
    const res = await handler(
      makeEvent('/remove-device', { deviceId: 'dev-1' }),
    );
    assert.strictEqual(res.statusCode, 200);
  });

  void it('remove-device: 400 on missing deviceId', async () => {
    const res = await handler(makeEvent('/remove-device', {}));
    assert.strictEqual(res.statusCode, 400);
  });

  void it('returns a PII-safe 500 when an SDK call throws', async () => {
    mock.restoreAll();
    installMocks({ searchProfileId: null });
    // SearchProfiles never resolves an id -> resolveOrCreateProfile throws.
    const res = await handler(
      makeEvent('/identify-user', { userProfile: { email: 'a@b.com' } }),
    );
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(JSON.parse(res.body).message, 'Internal error');
  });

  void it('identify-user: 500 error log carries only correlation-safe fields, NEVER the raw SDK message (PII)', async () => {
    // Customer Profiles BadRequestException echoes the rejected request input
    // (here the caller-submitted email) verbatim in its .message. The handler
    // MUST NOT log that message, or customer PII leaks into CloudWatch.
    const SENTINEL = 'sentinel@example.com';
    mock.restoreAll();
    installMocks({
      profileSend: (_input, name) => {
        if (name === 'UpdateProfileCommand') {
          const err: any = new Error(
            `Invalid email address: ${SENTINEL} is not a valid value`,
          );
          err.name = 'BadRequestException';
          err.$metadata = {
            httpStatusCode: 400,
            requestId: 'request-id-12345',
          };
          throw err;
        }
        // SearchProfiles / PutProfileObject fall through to defaults so the
        // flow reaches UpdateProfile.
        return undefined;
      },
    });
    const errorLog = mock.method(console, 'error', () => {});

    const res = await handler(
      makeEvent('/identify-user', { userProfile: { email: SENTINEL } }),
    );

    // (a) The caller still receives a generic 500 — response is unchanged.
    assert.strictEqual(res.statusCode, 500);
    assert.strictEqual(JSON.parse(res.body).message, 'Internal error');

    // (b) The catch logs the correlation-safe fields: name + statusCode +
    // requestId (derived from $metadata), and nothing else.
    const call = errorLog.mock.calls.find(
      (c) =>
        typeof c.arguments[0] === 'string' &&
        c.arguments[0].includes('identify-user.error'),
    );
    assert.ok(call, 'expected a "[write] identify-user.error" log line');
    const payload = JSON.parse(call.arguments[1] as string);
    assert.strictEqual(payload.name, 'BadRequestException');
    assert.strictEqual(payload.statusCode, 400);
    assert.strictEqual(payload.requestId, 'request-id-12345');
    // The message field is gone entirely (not just emptied).
    assert.strictEqual(payload.message, undefined);

    // (c) NOTHING logged to console.error may contain the caller PII sentinel.
    const allLogged = errorLog.mock.calls
      .flatMap((c) => c.arguments)
      .map((a) => (typeof a === 'string' ? a : JSON.stringify(a)))
      .join(' ');
    assert.ok(
      !allLogged.includes(SENTINEL),
      'error log must never contain the caller-submitted email (PII)',
    );
  });
});

/**
 * Layer C: the RUNTIME gate. The deploy-time custom resource only runs during a
 * deployment, so a customer who enables Identity Resolution afterwards would
 * otherwise keep writing into a merging domain until the next deploy. These
 * cases assert the write is refused per request instead, and — critically — that
 * the refusal happens BEFORE any profile or device write is issued.
 */
void describe('write handler merging gate', () => {
  /** Mocks where GetDomain reports the given matching configuration. */
  const installWithDomain = (domain: unknown): void =>
    installMocks({
      profileSend: (_input, name) =>
        name === 'GetDomainCommand' ? domain : undefined,
    });

  const MERGING_DOMAIN = {
    Matching: { Enabled: false },
    RuleBasedMatching: { Enabled: true, Status: 'PENDING' },
  };

  const identifyEvent = (): WriteEvent =>
    makeEvent('/identify-user', { userProfile: { email: 'a@b.com' } });

  const registerEvent = (): WriteEvent =>
    makeEvent('/register-device', {
      device: { deviceId: 'd1', token: 't1', channelType: 'APNS' },
    });

  const issued = (name: string): boolean =>
    profileCommands.some((c) => c.name === name);

  beforeEach(() => {
    process.env[ENV_DOMAIN_NAME] = 'Domain';
    process.env[ENV_DEVICES_TABLE_NAME] = 'Devices';
    clearMergingCache();
  });

  afterEach(() => {
    mock.restoreAll();
    clearMergingCache();
    delete process.env[ENV_DOMAIN_NAME];
    delete process.env[ENV_DEVICES_TABLE_NAME];
  });

  void it('identify-user: 409 and NO profile write when merging is enabled', async () => {
    installWithDomain(MERGING_DOMAIN);

    const res = await handler(identifyEvent());

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(
      JSON.parse(res.body).message,
      MERGING_REJECTED_MESSAGE,
      'the caller is told why, without naming the domain',
    );
    assert.ok(!issued('PutProfileObjectCommand'), 'no find-or-create');
    assert.ok(!issued('UpdateProfileCommand'), 'no attribute write');
    assert.ok(!issued('SearchProfilesCommand'), 'no profile read');
    assert.deepStrictEqual(
      profileCommands.map((c) => c.name),
      ['GetDomainCommand'],
      'the gate is the only call made',
    );
  });

  void it('register-device: 409 and NO device write when merging is enabled', async () => {
    installWithDomain(MERGING_DOMAIN);

    const res = await handler(registerEvent());

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(JSON.parse(res.body).message, MERGING_REJECTED_MESSAGE);
    assert.deepStrictEqual(
      ddbCommands.map((c) => c.name),
      [],
      'device ownership must not be claimed against a merging domain',
    );
  });

  void it('remove-device: still succeeds when merging is enabled, and is not gated at all', async () => {
    // De-registration must stay available. Blocking it would strand devices
    // registered against a profile, so it is never gated.
    installWithDomain(MERGING_DOMAIN);

    const res = await handler(makeEvent('/remove-device', { deviceId: 'd1' }));

    assert.strictEqual(res.statusCode, 200);
    assert.ok(
      !issued('GetDomainCommand'),
      'remove-device does not even pay for the check',
    );
    assert.deepStrictEqual(
      ddbCommands.map((c) => c.name),
      ['DeleteItemCommand'],
    );
  });

  void it('identify-user: 503 and NO profile write when the check cannot run (cold cache)', async () => {
    installMocks({
      profileSend: (_input, name) => {
        if (name === 'GetDomainCommand') {
          const err: any = new Error('denied');
          err.name = 'AccessDeniedException';
          throw err;
        }
        return undefined;
      },
    });

    const res = await handler(identifyEvent());

    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(
      JSON.parse(res.body).message,
      MERGING_UNVERIFIED_MESSAGE,
    );
    assert.ok(!issued('PutProfileObjectCommand'));
    assert.ok(!issued('UpdateProfileCommand'));
  });

  void it('allows writes on a non-merging domain and checks the domain only ONCE across requests', async () => {
    installWithDomain({
      Matching: { Enabled: false },
      RuleBasedMatching: { Enabled: false },
    });

    const identify = await handler(identifyEvent());
    const register = await handler(registerEvent());

    assert.strictEqual(identify.statusCode, 200);
    assert.strictEqual(register.statusCode, 200);
    assert.ok(issued('UpdateProfileCommand'), 'the profile write happened');
    assert.strictEqual(
      profileCommands.filter((c) => c.name === 'GetDomainCommand').length,
      1,
      'the second request is served from the TTL cache',
    );
  });
});

/**
 * Inbound user-agent propagation is asserted END-TO-END: rather than stubbing
 * `send` (which bypasses the middleware stack entirely), the shared
 * NodeHttpHandler prototype is mocked so the REAL client middleware runs and the
 * genuine outgoing `user-agent` header can be inspected.
 */
void describe('inbound user agent propagation', () => {
  /** The outgoing request headers of every SDK call, in order. */
  let sentHeaders: Array<Record<string, string>>;
  let restoreEnv: () => void;

  /**
   * The request-handler prototype is shared by every SDK v3 client, and is
   * reached through a throwaway instance so no extra dependency is needed.
   */
  const requestHandlerPrototype = Object.getPrototypeOf(
    new DynamoDBClient({ region: 'us-east-1' }).config.requestHandler,
  );

  beforeEach(() => {
    process.env[ENV_DOMAIN_NAME] = 'Domain';
    process.env[ENV_DEVICES_TABLE_NAME] = 'Devices';
    clearMergingCache();
    // Static credentials + region so signing succeeds without any real lookup.
    const previous = {
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
    process.env.AWS_REGION = process.env.AWS_REGION ?? 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'AKIAEXAMPLEEXAMPLE';
    process.env.AWS_SECRET_ACCESS_KEY = 'example-secret';
    restoreEnv = () => {
      process.env.AWS_REGION = previous.region;
      process.env.AWS_ACCESS_KEY_ID = previous.accessKeyId;
      process.env.AWS_SECRET_ACCESS_KEY = previous.secretAccessKey;
    };

    sentHeaders = [];
    mock.method(requestHandlerPrototype, 'handle', (request: any) => {
      sentHeaders.push(request.headers);
      // Canned SearchProfiles hit so identify-user resolves a profile and the
      // subsequent UpdateProfile call is issued too.
      return Promise.resolve({
        response: {
          statusCode: 200,
          headers: { 'content-type': 'application/json' },
          body: Readable.from([
            Buffer.from(
              JSON.stringify({ Items: [{ ProfileId: 'profile-123' }] }),
            ),
          ]),
        },
      });
    });
  });

  afterEach(() => {
    mock.restoreAll();
    restoreEnv();
    delete process.env[ENV_DOMAIN_NAME];
    delete process.env[ENV_DEVICES_TABLE_NAME];
  });

  const eventWithHeaders = (
    resourcePath: string,
    body: unknown,
    headers?: Record<string, string | undefined>,
  ): WriteEvent =>
    ({
      body: JSON.stringify(body),
      headers,
      requestContext: {
        resourcePath,
        httpMethod: 'POST',
        identity: { cognitoIdentityId: PRINCIPAL },
      },
    }) as WriteEvent;

  const userAgents = (): string[] =>
    sentHeaders.map((h) => h['user-agent'] ?? '');

  void it('propagates the inbound client user agent onto BOTH Customer Profiles and DynamoDB calls', async () => {
    const identify = await handler(
      eventWithHeaders(
        '/identify-user',
        { userProfile: { email: 'a@b.co' } },
        { 'x-amz-user-agent': 'aws-amplify/6.15.4 analytics/2' },
      ),
    );
    assert.strictEqual(identify.statusCode, 200);
    const profilesCalls = userAgents().length;
    assert.ok(profilesCalls > 0, 'Customer Profiles calls were made');

    const register = await handler(
      eventWithHeaders(
        '/register-device',
        { device: { deviceId: 'd1', token: 't1', channelType: 'APNS' } },
        { 'x-amz-user-agent': 'aws-amplify/6.15.4 analytics/2' },
      ),
    );
    assert.strictEqual(register.statusCode, 200);
    assert.ok(
      userAgents().length > profilesCalls,
      'a DynamoDB call was made for register-device',
    );

    // Every outgoing request carries the inbound pairs AND our own token.
    for (const ua of userAgents()) {
      assert.match(ua, /aws-amplify\/6\.15\.4/);
      assert.match(ua, /analytics\/2/);
      assert.ok(
        ua.includes(OWN_USER_AGENT_TOKEN),
        `expected "${ua}" to contain ${OWN_USER_AGENT_TOKEN}`,
      );
    }
  });

  void it('sends only our own token when the inbound header is absent', async () => {
    const res = await handler(
      eventWithHeaders('/register-device', {
        device: { deviceId: 'd1', token: 't1', channelType: 'APNS' },
      }),
    );
    assert.strictEqual(res.statusCode, 200);
    assert.ok(userAgents().length > 0, 'a DynamoDB call was made');
    for (const ua of userAgents()) {
      assert.ok(
        ua.includes(OWN_USER_AGENT_TOKEN),
        `expected "${ua}" to contain ${OWN_USER_AGENT_TOKEN}`,
      );
      assert.doesNotMatch(ua, /aws-amplify\/6\.15\.4/);
    }
  });

  void it('does NOT inherit a previous caller user agent on a later header-less request (warm container)', async () => {
    await handler(
      eventWithHeaders(
        '/register-device',
        { device: { deviceId: 'd1', token: 't1', channelType: 'APNS' } },
        { 'x-amz-user-agent': 'aws-amplify/6.15.4' },
      ),
    );
    assert.ok(
      userAgents().every((ua) => ua.includes('aws-amplify/6.15.4')),
      'the first request must carry the inbound user agent',
    );

    const countAfterFirst = sentHeaders.length;
    await handler(
      eventWithHeaders('/register-device', {
        device: { deviceId: 'd2', token: 't2', channelType: 'APNS' },
      }),
    );
    const secondRequestUserAgents = userAgents().slice(countAfterFirst);
    assert.ok(secondRequestUserAgents.length > 0, 'a second call was made');
    for (const ua of secondRequestUserAgents) {
      assert.doesNotMatch(
        ua,
        /aws-amplify\/6\.15\.4/,
        'a header-less request must NOT inherit the previous caller user agent',
      );
    }
  });

  void it('reads the inbound header case-insensitively', async () => {
    const res = await handler(
      eventWithHeaders(
        '/register-device',
        { device: { deviceId: 'd1', token: 't1', channelType: 'APNS' } },
        { 'X-Amz-User-Agent': 'aws-amplify/6.15.4' },
      ),
    );
    assert.strictEqual(res.statusCode, 200);
    assert.ok(userAgents().length > 0);
    for (const ua of userAgents()) {
      assert.match(ua, /aws-amplify\/6\.15\.4/);
    }
  });
});
