import type {
  APIGatewayProxyEventV2WithJWTAuthorizer,
  APIGatewayProxyStructuredResultV2,
} from 'aws-lambda';
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
 * Extract the verified subject claim from the API Gateway JWT authorizer.
 *
 * SECURITY: this is the ONLY source of identity. API Gateway populates it after
 * cryptographically verifying the Cognito token; the request body cannot
 * influence it.
 */
const verifiedSub = (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): string | undefined => {
  const claims = event.requestContext?.authorizer?.jwt?.claims as
    | Record<string, unknown>
    | undefined;
  const sub = claims?.sub;
  return typeof sub === 'string' && sub.length > 0 ? sub : undefined;
};

/**
 * HTTP API handler for `POST /identify-user`. Derives the caller identity from
 * the verified Cognito JWT `sub` claim, then find-or-creates the caller's
 * Customer Profiles profile and upserts their device object.
 */
export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer,
): Promise<APIGatewayProxyStructuredResultV2> => {
  const domainName = process.env[ENV_DOMAIN_NAME];
  if (!domainName) {
    console.error(`Missing required env var ${ENV_DOMAIN_NAME}`);
    return response(500, { error: 'Server misconfiguration' });
  }

  const sub = verifiedSub(event);
  if (!sub) {
    return response(401, {
      error: 'Unauthorized: missing or invalid verified subject claim',
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
    // 1) Resolve (or create + key) the profile bound to the verified sub.
    //    Isolated behind resolveOrCreateProfile so the identity-resolution
    //    strategy can be swapped without touching this orchestration.
    const { profileId } = await resolveOrCreateProfile(
      profiles,
      domainName,
      sub,
    );

    // 2) Register / update the device object (keyed by stable deviceId) only
    //    when device data is present. Token refreshes upsert in place: because
    //    PutProfileObject REPLACES the object for a deviceId, read back the
    //    prior object first to preserve its immutable `createdAt`.
    if (hasDeviceData(request)) {
      const deviceId = request.options!.deviceId!;
      const existingCreatedAt = await findExistingDeviceCreatedAt(
        profiles,
        domainName,
        profileId,
        deviceId,
      );
      const deviceObject = buildDeviceObject(sub, request, existingCreatedAt);
      await withTransientRetry(() =>
        profiles.send(
          new PutProfileObjectCommand({
            DomainName: domainName,
            ObjectTypeName: OBJECT_TYPE_DEVICE,
            Object: JSON.stringify(deviceObject),
          }),
        ),
      );
    }

    // 3) Set user-level / targeting attributes (incl. promoted hasGCM/hasAPNS)
    //    on the resolved profile.
    const update = buildProfileUpdate(sub, request);
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
    const message = err instanceof Error ? err.message : 'unknown error';
    console.error('Customer Profiles error', { err });
    return response(500, { error: `Customer Profiles error: ${message}` });
  }
};
