import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildDeviceObject,
  buildProfileUpdate,
  flatten,
  hasDeviceData,
  targetingFlagsForChannel,
} from './mapping.js';
import { IdentifyUserRequest } from './types.js';
import { COGNITO_USER_KEY, MAX_ATTRIBUTE_LENGTH } from '../../constants.js';

const SUB = 'verified-cognito-sub-123';

void describe('flatten', () => {
  void it('returns empty string for no values', () => {
    assert.strictEqual(flatten([]), '');
  });
  void it('returns the single element verbatim', () => {
    assert.strictEqual(flatten(['premium']), 'premium');
  });
  void it('JSON.stringifies when more than one value', () => {
    assert.strictEqual(
      flatten(['a', 'b', 'c']),
      JSON.stringify(['a', 'b', 'c']),
    );
  });
  void it('truncates to the max attribute length', () => {
    assert.strictEqual(
      flatten(['x'.repeat(1000)]).length,
      MAX_ATTRIBUTE_LENGTH,
    );
  });
});

void describe('targetingFlagsForChannel', () => {
  void it('promotes hasGCM for GCM', () => {
    assert.deepStrictEqual(targetingFlagsForChannel('GCM'), { hasGCM: 'true' });
  });
  void it('promotes hasAPNS for APNS and APNS_SANDBOX', () => {
    assert.deepStrictEqual(targetingFlagsForChannel('APNS'), {
      hasAPNS: 'true',
    });
    assert.deepStrictEqual(targetingFlagsForChannel('APNS_SANDBOX'), {
      hasAPNS: 'true',
    });
  });
  void it('promotes nothing for IN_APP / undefined', () => {
    assert.deepStrictEqual(targetingFlagsForChannel('IN_APP'), {});
    assert.deepStrictEqual(targetingFlagsForChannel(undefined), {});
  });
});

void describe('hasDeviceData', () => {
  void it('is true only when a stable deviceId is present', () => {
    assert.strictEqual(hasDeviceData({ userProfile: {} }), false);
    assert.strictEqual(
      hasDeviceData({ userProfile: {}, options: { address: 'tok' } }),
      false,
    );
    assert.strictEqual(
      hasDeviceData({ userProfile: {}, options: { deviceId: 'd1' } }),
      true,
    );
  });
});

void describe('buildProfileUpdate', () => {
  void it('maps standard person fields and stores userId as appUserId (never identity)', () => {
    const req: IdentifyUserRequest = {
      userId: 'client-supplied-user',
      userProfile: {
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        plan: 'premium',
      },
    };
    const u = buildProfileUpdate(SUB, req);
    assert.strictEqual(u.emailAddress, 'ada@example.com');
    assert.strictEqual(u.firstName, 'Ada');
    assert.strictEqual(u.lastName, 'Lovelace');
    assert.strictEqual(u.attributes.plan, 'premium');
    assert.strictEqual(u.attributes.appUserId, 'client-supplied-user');
    assert.strictEqual(u.attributes[COGNITO_USER_KEY], SUB);
  });

  void it('maps location to a standard address and geo to attributes', () => {
    const req: IdentifyUserRequest = {
      userProfile: {
        location: {
          city: 'Seattle',
          country: 'US',
          postalCode: '98101',
          region: 'WA',
          latitude: 47.6,
          longitude: -122.3,
        },
      },
    };
    const u = buildProfileUpdate(SUB, req);
    assert.deepStrictEqual(u.address, {
      city: 'Seattle',
      country: 'US',
      postalCode: '98101',
      province: 'WA',
    });
    assert.strictEqual(u.attributes.latitude, '47.6');
    assert.strictEqual(u.attributes.longitude, '-122.3');
  });

  void it('serializes dynamic maps and metrics; flattens multi-value entries', () => {
    const req: IdentifyUserRequest = {
      userProfile: {
        customProperties: { hobbies: ['chess', 'go'], newsletter: ['true'] },
        metrics: { logins: 5 },
      },
      options: { userAttributes: { roles: ['admin', 'beta'] } },
    };
    const u = buildProfileUpdate(SUB, req);
    assert.deepStrictEqual(JSON.parse(u.attributes.customProperties), {
      hobbies: JSON.stringify(['chess', 'go']),
      newsletter: 'true',
    });
    assert.deepStrictEqual(JSON.parse(u.attributes.userAttributes), {
      roles: JSON.stringify(['admin', 'beta']),
    });
    assert.deepStrictEqual(JSON.parse(u.attributes.metrics), { logins: 5 });
  });

  void it('promotes hasGCM / hasAPNS from the channel type', () => {
    assert.strictEqual(
      buildProfileUpdate(SUB, {
        userProfile: {},
        options: { channelType: 'GCM' },
      }).attributes.hasGCM,
      'true',
    );
    assert.strictEqual(
      buildProfileUpdate(SUB, {
        userProfile: {},
        options: { channelType: 'APNS_SANDBOX' },
      }).attributes.hasAPNS,
      'true',
    );
  });

  void it('omits empty address and undefined fields', () => {
    const u = buildProfileUpdate(SUB, { userProfile: {} });
    assert.strictEqual(u.address, undefined);
    assert.strictEqual(u.emailAddress, undefined);
    assert.deepStrictEqual(u.attributes, { [COGNITO_USER_KEY]: SUB });
  });
});

void describe('buildDeviceObject', () => {
  const isoRe = /^\d{4}-\d{2}-\d{2}T.*Z$/;

  void it('keys by stable deviceId, keeps token mutable, and sets the device schema', () => {
    const req: IdentifyUserRequest = {
      userProfile: {
        demographic: { platform: 'android', appVersion: '9.9.9' },
      },
      options: {
        deviceId: 'device-1',
        address: 'push-token-abc',
        channelType: 'GCM',
        optOut: 'NONE',
      },
    };
    const obj = buildDeviceObject(SUB, req);
    assert.strictEqual(obj.cognitoSub, SUB);
    assert.strictEqual(obj.deviceId, 'device-1');
    assert.strictEqual(obj.deviceToken, 'push-token-abc');
    assert.strictEqual(obj.channelType, 'GCM');
    assert.strictEqual(obj.platform, 'android');
    assert.strictEqual(obj.appVersion, '9.9.9');
    assert.strictEqual(obj.optOut, undefined);
    assert.match(obj.createdAt, isoRe);
    assert.match(obj.updatedAt, isoRe);
  });

  void it('prefers options.platform / options.appVersion over the demographic values', () => {
    const req: IdentifyUserRequest = {
      userProfile: {
        demographic: { platform: 'android', appVersion: '1.0.0' },
      },
      options: { deviceId: 'd', platform: 'iOS', appVersion: '2.5.0' },
    };
    const obj = buildDeviceObject(SUB, req);
    assert.strictEqual(obj.platform, 'iOS');
    assert.strictEqual(obj.appVersion, '2.5.0');
  });

  void it('createdAt is preserved from the existing object; updatedAt is always now', () => {
    const existingCreatedAt = '2020-01-01T00:00:00.000Z';
    const obj = buildDeviceObject(
      SUB,
      { userProfile: {}, options: { deviceId: 'device-1', address: 'tok' } },
      existingCreatedAt,
    );
    assert.strictEqual(obj.createdAt, existingCreatedAt);
    assert.notStrictEqual(obj.updatedAt, existingCreatedAt);
    assert.match(obj.updatedAt, isoRe);
  });

  void it('defaults createdAt to now when there is no existing object', () => {
    const obj = buildDeviceObject(SUB, {
      userProfile: {},
      options: { deviceId: 'device-1' },
    });
    assert.match(obj.createdAt, isoRe);
    assert.strictEqual(obj.createdAt, obj.updatedAt);
  });

  void it('token refresh: same deviceId, new deviceToken', () => {
    const base = {
      userProfile: {},
      options: { deviceId: 'device-1', channelType: 'APNS' as const },
    };
    const first = buildDeviceObject(SUB, {
      ...base,
      options: { ...base.options, address: 'token-v1' },
    });
    const second = buildDeviceObject(SUB, {
      ...base,
      options: { ...base.options, address: 'token-v2' },
    });
    assert.strictEqual(first.deviceId, second.deviceId);
    assert.strictEqual(first.deviceToken, 'token-v1');
    assert.strictEqual(second.deviceToken, 'token-v2');
  });
});
