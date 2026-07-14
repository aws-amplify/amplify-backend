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
import { mergeGuestIntoAuthed } from './merge_resolver.js';
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
 * find-or-create + device upsert + attribute write are identity-agnostic. On an
 * authed call carrying `options.guestIdentityId`, the prior guest
 * profile (and its devices) is folded into the authed profile via MergeProfiles.
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
    // 1) Resolve (or create + key) the profile bound to the verified caller.
    //    Isolated behind resolveOrCreateProfile so the identity-resolution
    //    strategy (authed sub vs guest identityId) is a single seam.
    const { profileId } = await resolveOrCreateProfile(
      profiles,
      domainName,
      principal,
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
    }

    // 3) Set user-level / targeting attributes (incl. promoted hasGCM/hasAPNS)
    //    on the resolved profile.
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

    // 4) Merge-on-sign-in: an AUTHENTICATED caller that carries its prior guest
    //    identityId folds the guest profile (+ its devices) into this authed
    //    profile via MergeProfiles. Guests never trigger a merge. Best-effort:
    //    a merge failure is logged but does not fail the identify result, which
    //    already succeeded above.
    const guestIdentityId = request.options?.guestIdentityId;
    if (principal.kind === 'authed' && guestIdentityId) {
      try {
        const outcome = await mergeGuestIntoAuthed(
          profiles,
          domainName,
          guestIdentityId,
          profileId,
        );
        console.log(
          '[identify] guestMerge',
          JSON.stringify({ merged: outcome.merged }),
        );
      } catch (mergeErr) {
        const name = mergeErr instanceof Error ? mergeErr.name : 'UnknownError';
        console.error('[identify] guestMergeError', JSON.stringify({ name }));
      }
    }

    return response(200, { status: 'ok' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    // Log only the error name (and HTTP status when present) — never the full
    // error object, whose stack / request input can carry customer content.
    const name = err instanceof Error ? err.name : 'UnknownError';
    const statusCode = (err as { $metadata?: { httpStatusCode?: number } })
      ?.$metadata?.httpStatusCode;
    console.error(
      '[identify] customerProfilesError',
      JSON.stringify({ name, statusCode }),
    );
    return response(500, { error: `Customer Profiles error: ${message}` });
  }
};
