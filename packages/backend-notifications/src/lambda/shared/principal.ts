// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

/**
 * Verified caller principal resolution.
 *
 * SECURITY: the `principalId` is derived SOLELY from the authorizer-verified
 * Cognito Identity Pool `cognitoIdentityId` on the request context — never from
 * the request body. All three write routes use IAM/SigV4 authorization, so API
 * Gateway populates `requestContext.identity.cognitoIdentityId` for BOTH
 * authenticated and unauthenticated (guest) callers with a value it
 * cryptographically verified. A guest is simply an unauthenticated
 * `cognitoIdentityId` — there is no separate guest path.
 *
 * Kept behind ONE function so a future verified-JWT-claim source stays an
 * additive change in a single place.
 */

/**
 * The minimal structural shape of the Lambda-proxy event this backend serves.
 *
 * HTTP API payload format 1.0 surfaces the SigV4/IAM-verified Cognito Identity
 * Pool identity at `requestContext.identity.cognitoIdentityId`. Payload format
 * 2.0 does NOT expose it there, which is exactly why the routes MUST use payload
 * format 1.0 (see the construct).
 */
export type WriteEvent = {
  body?: string | null;
  /** Present on payload format 1.0 as `<METHOD> <resourcePath>` (route key). */
  resource?: string;
  path?: string;
  httpMethod?: string;
  requestContext?: {
    resourcePath?: string;
    httpMethod?: string;
    identity?: {
      cognitoIdentityId?: string | null;
    };
  };
};

/**
 * Resolve the verified caller `principalId` from the SigV4/IAM-verified Cognito
 * Identity Pool `cognitoIdentityId` on the request context. Returns `undefined`
 * when it is absent (the handler then responds 403).
 */
export const resolvePrincipal = (event: WriteEvent): string | undefined => {
  const identityId = event.requestContext?.identity?.cognitoIdentityId;
  if (typeof identityId === 'string' && identityId.length > 0) {
    return identityId;
  }
  return undefined;
};
