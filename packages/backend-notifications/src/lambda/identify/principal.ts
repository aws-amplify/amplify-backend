import {
  COGNITO_IDENTITY_FIELD,
  COGNITO_IDENTITY_KEY,
  COGNITO_SUB_FIELD,
  COGNITO_USER_KEY,
  OBJECT_TYPE_GUEST_PROFILE,
  OBJECT_TYPE_PROFILE,
} from '../../constants.js';

/**
 * The resolved caller identity, abstracted over the two auth modes so the rest
 * of the identify pipeline (profile find-or-create, device upsert, attribute
 * write) is identity-agnostic:
 *
 *   - `authed`: a verified Cognito user-pool `sub` (JWT authorizer). Keyed by
 *     `cognitoUserKey` (field `cognitoSub`) on the `AmplifyProfile` object type.
 *   - `guest`: a verified Cognito Identity Pool `cognitoIdentityId` for an
 *     UNAUTHENTICATED identity (IAM/SigV4 authorizer). Keyed by
 *     `cognitoIdentityKey` (field `cognitoIdentityId`) on the
 *     `AmplifyGuestProfile` object type.
 *
 * `keyName` is the searchable/resolution key on the object types; `objectField`
 * is the field name the Lambda ingests via PutProfileObject (sourced into that
 * key); `profileObjectType` is the object type the find-or-create ingests into
 * (each mode has its OWN type because Customer Profiles requires exactly one
 * UNIQUE key per object type, carried by every ingested object); `value` is the
 * verified identity value. `value` is ALWAYS derived from an authorizer-verified
 * source — never from the request body.
 */
export type Principal = {
  readonly kind: 'authed' | 'guest';
  readonly keyName: string;
  readonly objectField: string;
  readonly profileObjectType: string;
  readonly value: string;
};

/** Build the authenticated principal from a verified Cognito user-pool `sub`. */
export const authedPrincipal = (sub: string): Principal => ({
  kind: 'authed',
  keyName: COGNITO_USER_KEY,
  objectField: COGNITO_SUB_FIELD,
  profileObjectType: OBJECT_TYPE_PROFILE,
  value: sub,
});

/** Build the guest principal from a verified Cognito Identity Pool identityId. */
export const guestPrincipal = (identityId: string): Principal => ({
  kind: 'guest',
  keyName: COGNITO_IDENTITY_KEY,
  objectField: COGNITO_IDENTITY_FIELD,
  profileObjectType: OBJECT_TYPE_GUEST_PROFILE,
  value: identityId,
});

/**
 * The minimal structural shape shared by the two Lambda-proxy event formats
 * this handler serves:
 *   - HTTP API payload format 2.0 + JWT authorizer (authed route): the verified
 *     `sub` is at `requestContext.authorizer.jwt.claims.sub`.
 *   - HTTP API payload format 1.0 + IAM/SigV4 authorization (guest route): the
 *     verified Cognito Identity Pool identity is at `requestContext.identity`
 *     (`cognitoIdentityId` + `cognitoAuthenticationType`). NOTE: format 2.0 has
 *     NO `identity` block at all, which is exactly why the guest route MUST use
 *     payload format 1.0.
 */
export type IdentifyEvent = {
  body?: string | null;
  requestContext?: {
    authorizer?: { jwt?: { claims?: Record<string, unknown> } };
    identity?: {
      cognitoIdentityId?: string | null;
      cognitoAuthenticationType?: string | null;
      cognitoIdentityPoolId?: string | null;
    };
  };
};

/**
 * Resolve the verified caller {@link Principal} from either event shape.
 *
 * SECURITY: identity is derived ONLY from authorizer-verified fields — the JWT
 * `sub` claim (which API Gateway populates only after cryptographically
 * verifying the Cognito token) or the SigV4/IAM-verified Cognito
 * `cognitoIdentityId`. The request body can never influence it. A guest is
 * accepted only when `cognitoAuthenticationType === 'unauthenticated'` AND a
 * `cognitoIdentityId` is present. Returns `undefined` when neither is present.
 */
export const resolvePrincipal = (
  event: IdentifyEvent,
): Principal | undefined => {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  const sub = claims?.sub;
  if (typeof sub === 'string' && sub.length > 0) {
    return authedPrincipal(sub);
  }

  const identity = event.requestContext?.identity;
  const identityId = identity?.cognitoIdentityId;
  if (
    identity?.cognitoAuthenticationType === 'unauthenticated' &&
    typeof identityId === 'string' &&
    identityId.length > 0
  ) {
    return guestPrincipal(identityId);
  }

  return undefined;
};
