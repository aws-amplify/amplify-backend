import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildProfileUpdate,
  flatten,
  hasDeviceData,
  targetingFlagsForChannel,
} from './mapping.js';
import { IdentifyUserRequest } from './types.js';
import { authedPrincipal, guestPrincipal } from './principal.js';
import {
  COGNITO_IDENTITY_KEY,
  COGNITO_USER_KEY,
  MAX_ATTRIBUTE_LENGTH,
} from '../../constants.js';

const SUB = 'verified-cognito-sub-123';
const IDENTITY_ID = 'us-east-1:guest-uuid-abc';
const P = authedPrincipal(SUB);
const GUEST = guestPrincipal(IDENTITY_ID);

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
  void it('never emits sliced (invalid) JSON for a large multi-value list; falls back to the first value', () => {
    const values = Array.from({ length: 50 }, (_, i) => `value-${i}`);
    const out = flatten(values);
    assert.ok(out.length <= MAX_ATTRIBUTE_LENGTH);
    if (out.startsWith('[')) {
      assert.deepStrictEqual(JSON.parse(out), values);
    } else {
      assert.strictEqual(out, values[0]);
    }
  });
  void it('falls back to the (truncated) first value when the JSON form overflows', () => {
    const big = ['a'.repeat(1000), 'b'.repeat(1000)];
    const out = flatten(big);
    assert.strictEqual(out, 'a'.repeat(MAX_ATTRIBUTE_LENGTH));
    assert.ok(out.length <= MAX_ATTRIBUTE_LENGTH);
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
    const u = buildProfileUpdate(P, req);
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
    const u = buildProfileUpdate(P, req);
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
    const u = buildProfileUpdate(P, req);
    assert.deepStrictEqual(JSON.parse(u.attributes.customProperties), {
      hobbies: JSON.stringify(['chess', 'go']),
      newsletter: 'true',
    });
    assert.deepStrictEqual(JSON.parse(u.attributes.userAttributes), {
      roles: JSON.stringify(['admin', 'beta']),
    });
    assert.deepStrictEqual(JSON.parse(u.attributes.metrics), { logins: 5 });
  });

  void it('keeps a large multi-value map valid or drops it (never stores sliced JSON)', () => {
    const bigMap: Record<string, string[]> = {};
    for (let i = 0; i < 40; i++) {
      bigMap[`key${i}`] = [`v${i}a`, `v${i}b`, `v${i}c`];
    }
    const u = buildProfileUpdate(P, {
      userProfile: { customProperties: bigMap },
    });
    if (u.attributes.customProperties !== undefined) {
      assert.doesNotThrow(() => JSON.parse(u.attributes.customProperties));
      assert.ok(u.attributes.customProperties.length <= MAX_ATTRIBUTE_LENGTH);
    }
  });

  void it('promotes hasGCM / hasAPNS from the channel type', () => {
    assert.strictEqual(
      buildProfileUpdate(P, {
        userProfile: {},
        options: { channelType: 'GCM' },
      }).attributes.hasGCM,
      'true',
    );
    assert.strictEqual(
      buildProfileUpdate(P, {
        userProfile: {},
        options: { channelType: 'APNS_SANDBOX' },
      }).attributes.hasAPNS,
      'true',
    );
  });

  void it('omits empty address and undefined fields', () => {
    const u = buildProfileUpdate(P, { userProfile: {} });
    assert.strictEqual(u.address, undefined);
    assert.strictEqual(u.emailAddress, undefined);
    assert.deepStrictEqual(u.attributes, { [COGNITO_USER_KEY]: SUB });
  });
});

void describe('guest principal', () => {
  void it('buildProfileUpdate keys the identity trail on cognitoIdentityKey, not cognitoUserKey', () => {
    const u = buildProfileUpdate(GUEST, {
      userId: 'client-supplied',
      userProfile: { plan: 'free' },
    });
    assert.strictEqual(u.attributes[COGNITO_IDENTITY_KEY], IDENTITY_ID);
    assert.strictEqual(u.attributes[COGNITO_USER_KEY], undefined);
    assert.strictEqual(u.attributes.appUserId, 'client-supplied');
    assert.strictEqual(u.attributes.plan, 'free');
  });
});
