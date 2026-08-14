// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  CustomerProfilesClient,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';
import { awsClientConfig } from '../shared/client_config.js';
import {
  setInboundUserAgent,
  withInboundUserAgent,
} from '../shared/client_ua.js';
import { type WriteEvent, resolvePrincipal } from '../shared/principal.js';
import { resolveOrCreateProfile } from '../shared/profile_resolver.js';
import {
  deleteDeviceByPrincipal,
  upsertDeviceOwner,
} from '../shared/device_store.js';
import { withTransientRetry } from '../shared/retry.js';
import {
  MERGING_REJECTED_MESSAGE,
  MERGING_UNVERIFIED_MESSAGE,
  type MergingGateDecision,
  checkMergingDisabled,
} from '../shared/merging_guard.js';
import { mergingEnabledMessage } from '../identity-resolution/check.js';
import { buildProfileUpdate } from './mapping.js';
import {
  validateIdentifyUser,
  validateRegisterDevice,
  validateRemoveDevice,
} from './validation.js';
import { ErrorResponse, SuccessResponse, WriteRoute } from './types.js';

/**
 * Module-level clients so warm invocations reuse the connection pool. Region is
 * resolved from the standard AWS_REGION Lambda environment variable.
 *
 * Each client is wrapped ONCE here so the inbound caller's user-agent is
 * propagated onto its requests without middleware accumulating per invocation.
 */
const profiles = withInboundUserAgent(
  new CustomerProfilesClient(awsClientConfig()),
);
const ddb = withInboundUserAgent(new DynamoDBClient(awsClientConfig()));

/**
 * Case-insensitive header lookup. HTTP API payload format 1.0 uses lower-case
 * header keys, but this does not rely on that.
 */
const getHeaderCaseInsensitive = (
  headers: WriteEvent['headers'],
  name: string,
): string | undefined => {
  if (!headers) {
    return undefined;
  }
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) {
      return value ?? undefined;
    }
  }
  return undefined;
};

const response = (
  statusCode: number,
  body: SuccessResponse | ErrorResponse,
): APIGatewayProxyResult => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

const ok = (): APIGatewayProxyResult => response(200, {});

/**
 * Routes whose write BINDS an end-user identity to profile or device state, and
 * which therefore must not run against a merging domain.
 *
 * `remove-device` is deliberately EXCLUDED. It only deletes a device binding, so
 * it cannot introduce a profile write — and blocking it would strand devices
 * registered against a profile precisely when merging is on. De-registration
 * stays available at all times.
 */
const MERGING_GATED_ROUTES: ReadonlySet<WriteRoute> = new Set<WriteRoute>([
  'identify-user',
  'register-device',
]);

/**
 * Turn a non-allow gate decision into the caller's response, logging the
 * actionable detail (which the response withholds) for the app owner.
 *
 * 409 vs 503 is a real distinction for clients: 409 means the domain
 * configuration must change and retrying is pointless, while 503 means the check
 * itself could not run and the request may be retried.
 */
const mergingRejection = (
  route: WriteRoute,
  domainName: string,
  decision: Exclude<MergingGateDecision, { outcome: 'allow' }>,
): APIGatewayProxyResult => {
  if (decision.outcome === 'reject-merging') {
    console.error(
      `[write] ${route}.refused`,
      JSON.stringify({
        freshness: decision.freshness,
        mechanism: decision.verdict.mechanism,
        status: decision.verdict.status,
      }),
      mergingEnabledMessage(domainName, decision.verdict),
    );
    return response(409, { message: MERGING_REJECTED_MESSAGE });
  }
  console.error(
    `[write] ${route}.refused`,
    JSON.stringify({ reason: 'unverified', errorName: decision.errorName }),
  );
  return response(503, { message: MERGING_UNVERIFIED_MESSAGE });
};

/**
 * Classify the target route from the payload-format-1.0 request context. The
 * route is derived from the verified `<METHOD> <resourcePath>` — never from the
 * body — and the path suffix selects the handler.
 */
export const classifyRoute = (event: WriteEvent): WriteRoute | undefined => {
  const path =
    event.requestContext?.resourcePath ?? event.resource ?? event.path ?? '';
  if (path.endsWith('/identify-user')) {
    return 'identify-user';
  }
  if (path.endsWith('/register-device')) {
    return 'register-device';
  }
  if (path.endsWith('/remove-device')) {
    return 'remove-device';
  }
  return undefined;
};

/**
 * Single write Lambda serving the three SigV4 routes:
 *   - POST /identify-user   — create/update the caller's Customer Profile.
 *   - POST /register-device — claim single device ownership in DynamoDB.
 *   - POST /remove-device   — ownership-gated device de-registration.
 *
 * The caller `principalId` is ALWAYS server-derived from the SigV4/IAM request
 * context (`requestContext.identity.cognitoIdentityId`) — never from the body.
 * A guest is simply an unauthenticated `principalId`; there is no separate path.
 */
export const handler = async (
  event: WriteEvent,
): Promise<APIGatewayProxyResult> => {
  // FIRST, before any SDK call: stage the inbound caller's user-agent for
  // propagation. Always called (even with no header) so a warm container can
  // never attribute this request to the previous caller.
  setInboundUserAgent(
    getHeaderCaseInsensitive(event.headers, 'x-amz-user-agent'),
  );

  const domainName = process.env[ENV_DOMAIN_NAME];
  const devicesTableName = process.env[ENV_DEVICES_TABLE_NAME];
  if (!domainName || !devicesTableName) {
    console.error(
      `Missing required env var(s): ${[
        !domainName ? ENV_DOMAIN_NAME : undefined,
        !devicesTableName ? ENV_DEVICES_TABLE_NAME : undefined,
      ]
        .filter(Boolean)
        .join(', ')}`,
    );
    return response(500, { message: 'Server misconfiguration' });
  }

  const route = classifyRoute(event);
  if (!route) {
    return response(404, { message: 'Unknown route' });
  }

  const principalId = resolvePrincipal(event);
  if (!principalId) {
    return response(403, { message: 'Missing verified caller identity' });
  }

  let parsed: unknown;
  try {
    parsed = event.body ? JSON.parse(event.body) : undefined;
  } catch {
    return response(400, { message: 'Invalid JSON request body' });
  }

  try {
    // Layer C: refuse identity-binding writes while the attached domain has
    // Identity Resolution enabled. Checked HERE, per request, because a
    // customer can enable matching long after the deploy-time guard ran. The
    // verdict is cached with a TTL and fails CLOSED when it cannot be
    // established at all — see checkMergingDisabled.
    if (MERGING_GATED_ROUTES.has(route)) {
      const decision = await checkMergingDisabled(profiles, domainName);
      if (decision.outcome !== 'allow') {
        return mergingRejection(route, domainName, decision);
      }
    }

    switch (route) {
      case 'identify-user':
        return await handleIdentifyUser(parsed, domainName, principalId);
      case 'register-device':
        return await handleRegisterDevice(
          parsed,
          devicesTableName,
          principalId,
        );
      case 'remove-device':
        return await handleRemoveDevice(parsed, devicesTableName, principalId);
    }
  } catch (err) {
    // The raw SDK error message is INTENTIONALLY DROPPED: Customer Profiles
    // BadRequestException messages echo the rejected request input verbatim
    // (e.g. the caller-submitted email/phone), so logging err.message would
    // leak customer content (PII) into CloudWatch. We log ONLY
    // correlation-safe fields — the error name and the $metadata HTTP status /
    // requestId. principalId (PII-adjacent) is never logged, and the caller
    // always receives a generic message. err.stack is likewise excluded: a
    // Node.js stack string begins with "<name>: <message>", so logging it
    // would reintroduce the same leak — use requestId for correlation.
    const name = err instanceof Error ? err.name : 'UnknownError';
    const meta = (
      err as { $metadata?: { httpStatusCode?: number; requestId?: string } }
    )?.$metadata;
    console.error(
      `[write] ${route}.error`,
      JSON.stringify({
        name,
        statusCode: meta?.httpStatusCode,
        requestId: meta?.requestId,
      }),
    );
    return response(500, { message: 'Internal error' });
  }
};

const handleIdentifyUser = async (
  parsed: unknown,
  domainName: string,
  principalId: string,
): Promise<APIGatewayProxyResult> => {
  const validation = validateIdentifyUser(parsed);
  if (!validation.ok) {
    return response(400, { message: validation.error });
  }

  const { profileId } = await resolveOrCreateProfile(
    profiles,
    domainName,
    principalId,
  );

  const update = buildProfileUpdate(validation.value.userProfile);
  await withTransientRetry(() =>
    profiles.send(
      new UpdateProfileCommand({
        DomainName: domainName,
        ProfileId: profileId,
        EmailAddress: update.emailAddress,
        PhoneNumber: update.phoneNumber,
        FirstName: update.firstName,
        LastName: update.lastName,
        Address: update.address
          ? {
              City: update.address.city,
              Country: update.address.country,
              PostalCode: update.address.postalCode,
              Province: update.address.province,
            }
          : undefined,
        Attributes: update.attributes,
      }),
    ),
  );

  return ok();
};

const handleRegisterDevice = async (
  parsed: unknown,
  devicesTableName: string,
  principalId: string,
): Promise<APIGatewayProxyResult> => {
  const validation = validateRegisterDevice(parsed);
  if (!validation.ok) {
    return response(400, { message: validation.error });
  }
  const device = validation.value.device;

  // Pure DDB write: the device keys on the SigV4 principalId directly, so there
  // is NO profile resolution and no forced profile creation. CRITICAL COMMIT:
  // a strongly-consistent last-writer-wins UpdateItem on the deviceId PK claims
  // single ownership (overwriting IS the eviction). Throws on failure so the
  // registration fails rather than leaving stale ownership.
  await upsertDeviceOwner(ddb, devicesTableName, {
    deviceId: device.deviceId,
    token: device.token,
    principalId,
    channelType: device.channelType,
    platform: device.platform,
    appVersion: device.appVersion,
  });

  return ok();
};

const handleRemoveDevice = async (
  parsed: unknown,
  devicesTableName: string,
  principalId: string,
): Promise<APIGatewayProxyResult> => {
  const validation = validateRemoveDevice(parsed);
  if (!validation.ok) {
    return response(400, { message: validation.error });
  }

  // Ownership-gated conditional delete: the device carries its owning
  // principalId, so gate directly (no profile resolve). A re-homed / absent
  // device yields ConditionalCheckFailed -> idempotent 200 no-op.
  await deleteDeviceByPrincipal(
    ddb,
    devicesTableName,
    validation.value.deviceId,
    principalId,
  );

  return ok();
};
