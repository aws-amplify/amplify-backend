import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateBody } from './validation.js';

void describe('validateBody', () => {
  void it('rejects a non-object body', () => {
    const res = validateBody('not an object');
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /must be a JSON object/);
  });

  void it('requires userProfile to be an object', () => {
    const res = validateBody({});
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /userProfile is required/);
  });

  void it('accepts a minimal valid request', () => {
    const res = validateBody({ userProfile: { name: 'Ada' } });
    assert.strictEqual(res.ok, true);
    assert.ok(res.value);
    assert.strictEqual(res.value?.userProfile.name, 'Ada');
  });

  void it('rejects a non-string userId', () => {
    const res = validateBody({ userId: 42, userProfile: {} });
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /userId must be a string/);
  });

  void it('rejects non-string standard profile fields', () => {
    const res = validateBody({ userProfile: { email: 123 } });
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /userProfile.email must be a string/);
  });

  void it('rejects malformed customProperties', () => {
    const res = validateBody({
      userProfile: { customProperties: { a: 'not-an-array' } },
    });
    assert.strictEqual(res.ok, false);
    assert.match(
      res.error ?? '',
      /customProperties must be a map of string arrays/,
    );
  });

  void it('rejects non-numeric metrics', () => {
    const res = validateBody({ userProfile: { metrics: { logins: 'five' } } });
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /metrics must be a map of numbers/);
  });

  void it('rejects an invalid channelType', () => {
    const res = validateBody({
      userProfile: {},
      options: { channelType: 'CARRIER_PIGEON' },
    });
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /channelType must be one of/);
  });

  void it('rejects an invalid optOut', () => {
    const res = validateBody({ userProfile: {}, options: { optOut: 'MAYBE' } });
    assert.strictEqual(res.ok, false);
    assert.match(res.error ?? '', /optOut must be one of/);
  });

  void it('rejects a non-string deviceId / address', () => {
    assert.strictEqual(
      validateBody({ userProfile: {}, options: { deviceId: 7 } }).ok,
      false,
    );
    assert.strictEqual(
      validateBody({ userProfile: {}, options: { address: 7 } }).ok,
      false,
    );
  });

  void it('accepts a fully-populated valid request', () => {
    const res = validateBody({
      userId: 'u1',
      userProfile: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        plan: 'premium',
        customProperties: { hobbies: ['chess'] },
        metrics: { logins: 3 },
        demographic: { platform: 'ios', appVersion: '1.2.3' },
        location: { city: 'Seattle', country: 'US' },
      },
      options: {
        deviceId: 'device-1',
        address: 'token',
        channelType: 'APNS',
        optOut: 'NONE',
        userAttributes: { roles: ['admin'] },
      },
    });
    assert.strictEqual(res.ok, true);
  });
});
