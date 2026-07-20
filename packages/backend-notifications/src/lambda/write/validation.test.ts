import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateIdentifyUser,
  validateRegisterDevice,
  validateRemoveDevice,
} from './validation.js';

void describe('validateIdentifyUser', () => {
  void it('accepts a well-formed userProfile', () => {
    const r = validateIdentifyUser({
      userProfile: {
        email: 'a@b.com',
        name: 'Ada Lovelace',
        phone: '+1555',
        location: { city: 'Seattle', region: 'WA' },
        customAttributes: { plan: 'premium' },
      },
    });
    assert.ok(r.ok);
  });

  void it('rejects a missing / non-object userProfile', () => {
    assert.strictEqual(validateIdentifyUser({}).ok, false);
    assert.strictEqual(validateIdentifyUser(null).ok, false);
    assert.strictEqual(validateIdentifyUser({ userProfile: 5 }).ok, false);
  });

  void it('rejects overlong standard fields (> 255)', () => {
    const r = validateIdentifyUser({
      userProfile: { email: 'x'.repeat(256) },
    });
    assert.strictEqual(r.ok, false);
  });

  void it('rejects non-string customAttributes values', () => {
    const r = validateIdentifyUser({
      userProfile: { customAttributes: { k: 5 } },
    });
    assert.strictEqual(r.ok, false);
  });

  void it('rejects a non-object location', () => {
    const r = validateIdentifyUser({ userProfile: { location: 'nope' } });
    assert.strictEqual(r.ok, false);
  });
});

void describe('validateRegisterDevice', () => {
  const validDevice = {
    token: 'tok-1',
    deviceId: 'dev-1',
    platform: 'iOS',
    appVersion: '1.0.0',
    channelType: 'APNS',
  };

  void it('accepts a well-formed device', () => {
    const r = validateRegisterDevice({ device: validDevice });
    assert.ok(r.ok);
    if (r.ok) {
      assert.strictEqual(r.value.device.deviceId, 'dev-1');
    }
  });

  void it('accepts each valid channelType', () => {
    for (const channelType of ['APNS', 'APNS_SANDBOX', 'GCM']) {
      const r = validateRegisterDevice({
        device: { ...validDevice, channelType },
      });
      assert.ok(r.ok, `expected ${channelType} to be valid`);
    }
  });

  void it('rejects a missing device', () => {
    assert.strictEqual(validateRegisterDevice({}).ok, false);
  });

  void it('rejects an empty token or deviceId', () => {
    assert.strictEqual(
      validateRegisterDevice({ device: { ...validDevice, token: '' } }).ok,
      false,
    );
    assert.strictEqual(
      validateRegisterDevice({ device: { ...validDevice, deviceId: '' } }).ok,
      false,
    );
  });

  void it('rejects an unknown channelType (incl. IN_APP)', () => {
    assert.strictEqual(
      validateRegisterDevice({
        device: { ...validDevice, channelType: 'IN_APP' },
      }).ok,
      false,
    );
    assert.strictEqual(
      validateRegisterDevice({
        device: { ...validDevice, channelType: 'SMS' },
      }).ok,
      false,
    );
  });

  void it('rejects overlong token (> 255)', () => {
    const r = validateRegisterDevice({
      device: { ...validDevice, token: 'x'.repeat(256) },
    });
    assert.strictEqual(r.ok, false);
  });
});

void describe('validateRemoveDevice', () => {
  void it('accepts a non-empty deviceId', () => {
    const r = validateRemoveDevice({ deviceId: 'dev-1' });
    assert.ok(r.ok);
    if (r.ok) {
      assert.strictEqual(r.value.deviceId, 'dev-1');
    }
  });

  void it('rejects a missing / empty deviceId', () => {
    assert.strictEqual(validateRemoveDevice({}).ok, false);
    assert.strictEqual(validateRemoveDevice({ deviceId: '' }).ok, false);
    assert.strictEqual(validateRemoveDevice(null).ok, false);
  });
});
