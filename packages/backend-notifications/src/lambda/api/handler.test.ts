/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles capture
   structurally-typed AWS SDK command inputs. */

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import assert from 'node:assert';
import { CustomerProfilesClient } from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { classifyRoute, handler } from './handler.js';
import { WriteEvent } from '../shared/principal.js';
import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';

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

const installMocks = (opts?: {
  searchProfileId?: string | null;
  ddbSend?: (input: any, name: string) => unknown;
  profileSend?: (input: any, name: string) => unknown;
}): void => {
  profileCommands = [];
  ddbCommands = [];
  mock.method(CustomerProfilesClient.prototype, 'send', (command: any) => {
    const name = command.constructor.name;
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
  });
  mock.method(DynamoDBClient.prototype, 'send', (command: any) => {
    const name = command.constructor.name;
    ddbCommands.push({ name, input: command.input });
    if (opts?.ddbSend) {
      return Promise.resolve(opts.ddbSend(command.input, name));
    }
    return Promise.resolve({});
  });
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
