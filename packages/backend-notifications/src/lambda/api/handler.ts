import type { APIGatewayProxyResult } from 'aws-lambda';
import {
  CustomerProfilesClient,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';
import { type WriteEvent, resolvePrincipal } from '../shared/principal.js';
import { resolveOrCreateProfile } from '../shared/profile_resolver.js';
import {
  deleteDeviceByPrincipal,
  upsertDeviceOwner,
} from '../shared/device_store.js';
import { withTransientRetry } from '../shared/retry.js';
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
 */
const profiles = new CustomerProfilesClient({});
const ddb = new DynamoDBClient({});

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
