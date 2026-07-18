import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import {
  CustomerProfilesClient,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

import { validateBody } from './validation.js';
import { buildProfileUpdate, hasDeviceData } from './mapping.js';
import { resolveOrCreateProfile } from './profile_resolver.js';
import { IdentifyEvent, resolvePrincipal } from './principal.js';
import { withTransientRetry } from '../shared/retry.js';
import { upsertDeviceOwner } from '../shared/device_store.js';
import { ENV_DEVICES_TABLE_NAME, ENV_DOMAIN_NAME } from '../../constants.js';
import { ErrorResponse, SuccessResponse } from './types.js';

/**
 * Module-level clients so warm invocations reuse the connection pool. Region is
 * resolved from the standard AWS_REGION Lambda environment variable.
 */
const profiles = new CustomerProfilesClient({});
const ddb = new DynamoDBClient({});

const response = (
  statusCode: number,
  body: SuccessResponse | ErrorResponse,
): APIGatewayProxyStructuredResultV2 => ({
  statusCode,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

/**
 * HTTP API handler for the identify-user routes. Serves BOTH:
 *   - `POST /identify-user`        — authed (Cognito user-pool JWT authorizer,
 *     payload format 2.0). Identity = verified `sub`.
 *   - `POST /identify-user-guest`  — guest (IAM/SigV4 authorization, payload
 *     format 1.0). Identity = verified Cognito Identity Pool `cognitoIdentityId`
 *     of an UNAUTHENTICATED identity.
 *
 * The verified {@link Principal} abstracts the two modes; the profile
 * find-or-create + device ownership write + attribute write are
 * identity-agnostic. Guest and authenticated profiles are kept COMPLETELY
 * SEPARATE (no profile merge).
 *
 * Device ownership is authoritative in the DynamoDB Devices table: when an
 * identify (re)registers a device, a strongly-consistent last-writer-wins
 * UpdateItem on the stable `deviceId` sets this profile as the SOLE owner.
 * Overwriting the item IS the eviction — atomic, no cross-profile search, no
 * eventual-consistency window — so a physical device routes to exactly one
 * profile at any instant. This DDB write is the CRITICAL COMMIT: if it fails,
 * the registration fails rather than leaving ownership stale.
 */
export const handler = async (
  event: IdentifyEvent,
): Promise<APIGatewayProxyStructuredResultV2> => {
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
    return response(500, { error: 'Server misconfiguration' });
  }

  const principal = resolvePrincipal(event);
  if (!principal) {
    return response(401, {
      error: 'Unauthorized: missing or invalid verified caller identity',
    });
  }

  let parsed: unknown;
  try {
    parsed = event.body ? JSON.parse(event.body) : undefined;
  } catch {
    return response(400, { error: 'Invalid JSON request body' });
  }

  const validation = validateBody(parsed);
  if (!validation.ok || !validation.value) {
    return response(400, { error: validation.error ?? 'Invalid request' });
  }
  const request = validation.value;

  try {
    const { profileId } = await resolveOrCreateProfile(
      profiles,
      domainName,
      principal,
    );

    // CRITICAL COMMIT: claim ownership of the device for THIS profile via a
    // strongly-consistent last-writer-wins UpdateItem on the deviceId PK. This
    // IS the eviction from any prior owner. It THROWS on failure so the whole
    // registration fails (caught below → 500) rather than leaving stale
    // ownership. Requires a push token (options.address) to route to.
    if (hasDeviceData(request) && request.options?.address) {
      const options = request.options;
      const demographic = request.userProfile?.demographic;
      await upsertDeviceOwner(ddb, devicesTableName, {
        deviceId: options.deviceId!,
        token: options.address!,
        profileId,
        channelType: options.channelType,
        platform: options.platform ?? demographic?.platform,
        appVersion: options.appVersion ?? demographic?.appVersion,
      });
    }

    // Refresh the profile's person / targeting attributes — including the
    // promoted push-capability flags (hasAPNS / hasGCM / platform) — so Connect
    // channel segmentation still works even though device records live in DDB.
    const update = buildProfileUpdate(principal, request);
    await withTransientRetry(() =>
      profiles.send(
        new UpdateProfileCommand({
          DomainName: domainName,
          ProfileId: profileId,
          EmailAddress: update.emailAddress,
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

    return response(200, { status: 'ok' });
  } catch (err) {
    // Full detail (name, HTTP status, message) is logged SERVER-SIDE only; the
    // client gets a generic 'Internal error' so a raw SDK message — which can
    // carry request input / customer content — never leaks to the caller.
    const name = err instanceof Error ? err.name : 'UnknownError';
    const message = err instanceof Error ? err.message : 'unknown error';
    const statusCode = (err as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    console.error(
      '[identify] registrationError',
      JSON.stringify({ name, statusCode, message }),
    );
    return response(500, { error: 'Internal error' });
  }
};
