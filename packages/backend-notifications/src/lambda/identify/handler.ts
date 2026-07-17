import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import {
  CustomerProfilesClient,
  PutProfileObjectCommand,
  UpdateProfileCommand,
} from '@aws-sdk/client-customer-profiles';

import { validateBody } from './validation.js';
import {
  buildDeviceObject,
  buildProfileUpdate,
  hasDeviceData,
} from './mapping.js';
import { resolveOrCreateProfile } from './profile_resolver.js';
import { findExistingDeviceCreatedAt } from './device_resolver.js';
import { evictDeviceFromOtherProfiles } from './device_evictor.js';
import { IdentifyEvent, resolvePrincipal } from './principal.js';
import { withTransientRetry } from '../shared/retry.js';
import { ENV_DOMAIN_NAME, OBJECT_TYPE_DEVICE } from '../../constants.js';
import { ErrorResponse, SuccessResponse } from './types.js';

/**
 * Module-level client so warm invocations reuse the connection pool. Region is
 * resolved from the standard AWS_REGION Lambda environment variable.
 */
const profiles = new CustomerProfilesClient({});

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
 * find-or-create + device upsert + attribute write are identity-agnostic. Guest
 * and authenticated profiles are kept COMPLETELY SEPARATE (no profile merge).
 * When an identify (re)registers a device, that device is evicted from OTHER
 * profiles whose stored token matches the token just presented, so a physical
 * device ends up on exactly one profile (see device_evictor). This runs
 * UNIFORMLY on both paths and is token-matched, so a caller that does not hold
 * the device's live token cannot strip it off another profile.
 */
export const handler = async (
  event: IdentifyEvent,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const domainName = process.env[ENV_DOMAIN_NAME];
  if (!domainName) {
    console.error(`Missing required env var ${ENV_DOMAIN_NAME}`);
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

    // Token refreshes upsert in place: because PutProfileObject REPLACES the
    // object for a deviceId, read back the prior object first to preserve its
    // immutable `createdAt`.
    if (hasDeviceData(request)) {
      const deviceId = request.options!.deviceId!;
      const existingCreatedAt = await findExistingDeviceCreatedAt(
        profiles,
        domainName,
        profileId,
        deviceId,
      );
      const deviceObject = buildDeviceObject(
        principal,
        request,
        existingCreatedAt,
      );
      await withTransientRetry(() =>
        profiles.send(
          new PutProfileObjectCommand({
            DomainName: domainName,
            ObjectTypeName: OBJECT_TYPE_DEVICE,
            Object: JSON.stringify(deviceObject),
          }),
        ),
      );

      // Best-effort: never throws, so it cannot fail the registration that just
      // succeeded. Token-matched so a caller without the live token cannot strip
      // the device off another profile.
      await evictDeviceFromOtherProfiles(
        profiles,
        domainName,
        deviceId,
        profileId,
        request.options?.address,
      );
    }

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
      '[identify] customerProfilesError',
      JSON.stringify({ name, statusCode, message }),
    );
    return response(500, { error: 'Internal error' });
  }
};
