import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildProfileUpdate, splitName } from './mapping.js';

void describe('splitName', () => {
  void it('splits on the first space into first / last', () => {
    assert.deepStrictEqual(splitName('Ada Lovelace'), {
      firstName: 'Ada',
      lastName: 'Lovelace',
    });
  });

  void it('keeps a multi-word remainder as the last name', () => {
    assert.deepStrictEqual(splitName('Ada B Lovelace'), {
      firstName: 'Ada',
      lastName: 'B Lovelace',
    });
  });

  void it('returns only a first name for a single token', () => {
    assert.deepStrictEqual(splitName('Ada'), { firstName: 'Ada' });
  });
});

void describe('buildProfileUpdate', () => {
  void it('maps standard fields: email, name, phone, location (region -> Province)', () => {
    const u = buildProfileUpdate({
      email: 'ada@example.com',
      name: 'Ada Lovelace',
      phone: '+15551234567',
      location: {
        city: 'Seattle',
        country: 'US',
        postalCode: '98101',
        region: 'WA',
      },
    });
    assert.strictEqual(u.emailAddress, 'ada@example.com');
    assert.strictEqual(u.phoneNumber, '+15551234567');
    assert.strictEqual(u.firstName, 'Ada');
    assert.strictEqual(u.lastName, 'Lovelace');
    assert.deepStrictEqual(u.address, {
      city: 'Seattle',
      country: 'US',
      postalCode: '98101',
      province: 'WA',
    });
  });

  void it('sets Attributes to customAttributes ONLY (no backend-derived attributes)', () => {
    const u = buildProfileUpdate({
      email: 'x@example.com',
      customAttributes: { plan: 'premium', tier: 'gold' },
    });
    const attrs = u.attributes as Record<string, string | undefined>;
    assert.deepStrictEqual(u.attributes, { plan: 'premium', tier: 'gold' });
    // No appUserId / hasAPNS / hasGCM / platform / locale / metrics etc.
    assert.strictEqual(attrs['appUserId'], undefined);
    assert.strictEqual(attrs['hasAPNS'], undefined);
    assert.strictEqual(attrs['hasGCM'], undefined);
    assert.strictEqual(attrs['platform'], undefined);
  });

  void it('produces an empty Attributes map when no customAttributes are supplied', () => {
    const u = buildProfileUpdate({ email: 'x@example.com' });
    assert.deepStrictEqual(u.attributes, {});
  });

  void it('omits address entirely when no location fields are present', () => {
    const u = buildProfileUpdate({ name: 'Solo' });
    assert.strictEqual(u.address, undefined);
    assert.strictEqual(u.firstName, 'Solo');
    assert.strictEqual(u.lastName, undefined);
  });

  void it('caps custom attribute values at the Customer Profiles length limit', () => {
    const long = 'x'.repeat(300);
    const u = buildProfileUpdate({ customAttributes: { big: long } });
    assert.strictEqual(u.attributes.big.length, 255);
  });

  void it('drops empty-string / non-string custom attribute values', () => {
    const u = buildProfileUpdate({
      customAttributes: {
        empty: '',
        good: 'ok',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- guard test
        num: 5 as any,
      },
    });
    assert.deepStrictEqual(u.attributes, { good: 'ok' });
  });
});
