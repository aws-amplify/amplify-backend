import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  IdentifyEvent,
  authedPrincipal,
  guestPrincipal,
  resolvePrincipal,
} from './principal.js';
import {
  COGNITO_IDENTITY_FIELD,
  COGNITO_IDENTITY_KEY,
  COGNITO_SUB_FIELD,
  COGNITO_USER_KEY,
  OBJECT_TYPE_GUEST_PROFILE,
  OBJECT_TYPE_PROFILE,
} from '../../constants.js';

const SUB = 'verified-cognito-sub-123';
const IDENTITY_ID = 'us-east-1:guest-uuid-abc';

const authedEvent = (sub: unknown): IdentifyEvent => ({
  requestContext: { authorizer: { jwt: { claims: { sub } } } },
});

const guestEvent = (
  cognitoIdentityId: string | null | undefined,
  cognitoAuthenticationType: string | null | undefined,
): IdentifyEvent => ({
  requestContext: {
    identity: { cognitoIdentityId, cognitoAuthenticationType },
  },
});

void describe('authedPrincipal', () => {
  void it('keys on cognitoUserKey / cognitoSub against the AmplifyProfile type', () => {
    const p = authedPrincipal(SUB);
    assert.strictEqual(p.kind, 'authed');
    assert.strictEqual(p.keyName, COGNITO_USER_KEY);
    assert.strictEqual(p.objectField, COGNITO_SUB_FIELD);
    assert.strictEqual(p.profileObjectType, OBJECT_TYPE_PROFILE);
    assert.strictEqual(p.value, SUB);
  });
});

void describe('guestPrincipal', () => {
  void it('keys on cognitoIdentityKey / cognitoIdentityId against the AmplifyGuestProfile type', () => {
    const p = guestPrincipal(IDENTITY_ID);
    assert.strictEqual(p.kind, 'guest');
    assert.strictEqual(p.keyName, COGNITO_IDENTITY_KEY);
    assert.strictEqual(p.objectField, COGNITO_IDENTITY_FIELD);
    assert.strictEqual(p.profileObjectType, OBJECT_TYPE_GUEST_PROFILE);
    assert.strictEqual(p.value, IDENTITY_ID);
  });
});

void describe('resolvePrincipal', () => {
  void it('resolves an authed principal from a verified JWT sub claim', () => {
    const p = resolvePrincipal(authedEvent(SUB));
    assert.strictEqual(p?.kind, 'authed');
    assert.strictEqual(p?.value, SUB);
  });

  void it('resolves a guest principal from a verified UNAUTHENTICATED identity', () => {
    const p = resolvePrincipal(guestEvent(IDENTITY_ID, 'unauthenticated'));
    assert.strictEqual(p?.kind, 'guest');
    assert.strictEqual(p?.value, IDENTITY_ID);
  });

  void it('prefers the authed JWT sub when BOTH a sub and an identity are present', () => {
    const event: IdentifyEvent = {
      requestContext: {
        authorizer: { jwt: { claims: { sub: SUB } } },
        identity: {
          cognitoIdentityId: IDENTITY_ID,
          cognitoAuthenticationType: 'unauthenticated',
        },
      },
    };
    const p = resolvePrincipal(event);
    assert.strictEqual(p?.kind, 'authed');
    assert.strictEqual(p?.value, SUB);
  });

  void it('rejects an identity that is NOT unauthenticated (never treats an authenticated identity as a guest)', () => {
    assert.strictEqual(
      resolvePrincipal(guestEvent(IDENTITY_ID, 'authenticated')),
      undefined,
    );
    assert.strictEqual(
      resolvePrincipal(guestEvent(IDENTITY_ID, undefined)),
      undefined,
    );
  });

  void it('rejects a guest with no cognitoIdentityId even when unauthenticated', () => {
    assert.strictEqual(
      resolvePrincipal(guestEvent(null, 'unauthenticated')),
      undefined,
    );
    assert.strictEqual(
      resolvePrincipal(guestEvent('', 'unauthenticated')),
      undefined,
    );
  });

  void it('rejects an empty or non-string sub claim', () => {
    assert.strictEqual(resolvePrincipal(authedEvent('')), undefined);
    assert.strictEqual(resolvePrincipal(authedEvent(123)), undefined);
  });

  void it('returns undefined when neither a verified sub nor an identity is present', () => {
    assert.strictEqual(resolvePrincipal({}), undefined);
    assert.strictEqual(resolvePrincipal({ requestContext: {} }), undefined);
  });
});
