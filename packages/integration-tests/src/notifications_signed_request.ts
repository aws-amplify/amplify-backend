// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

import { SignatureV4 } from '@smithy/signature-v4';
import { HttpRequest } from '@smithy/protocol-http';
import { Sha256 } from '@aws-crypto/sha256-js';
import { IamCredentials } from './types.js';

/** Small HTTP result of a signed write-route call. */
export type SignedResponse = {
  status: number;
  body: string;
};

/**
 * SigV4-sign a POST to `{endpoint}{path}` for `execute-api` with the given
 * Identity Pool IAM credentials and send it via fetch.
 *
 * Shared by the notifications e2e projects: every write route of the
 * notifications HTTP API uses IAM (SigV4) authorization, so a test caller is
 * always an Identity Pool principal signing the request itself.
 * @param endpoint Origin + base path of the deployed HTTP API.
 * @param path Route path, e.g. `/identify-user`.
 * @param region Region to sign for.
 * @param credentials Identity Pool IAM credentials of the calling principal.
 * @param body Request body, serialized to JSON before signing.
 * @returns The response status and raw body.
 */
export const signedPost = async (
  endpoint: string,
  path: string,
  region: string,
  credentials: IamCredentials,
  body: unknown,
): Promise<SignedResponse> =>
  signedPostRaw(endpoint, path, region, credentials, JSON.stringify(body));

/**
 * Like {@link signedPost} but sends a RAW string body (used to exercise the
 * malformed-JSON rejection path). Signs the exact bytes that are sent.
 * @param endpoint Origin + base path of the deployed HTTP API.
 * @param path Route path, e.g. `/identify-user`.
 * @param region Region to sign for.
 * @param credentials Identity Pool IAM credentials of the calling principal.
 * @param payload The exact request body bytes to sign and send.
 * @returns The response status and raw body.
 */
export const signedPostRaw = async (
  endpoint: string,
  path: string,
  region: string,
  credentials: IamCredentials,
  payload: string,
): Promise<SignedResponse> => {
  const url = new URL(`${endpoint}${path}`);
  const request = new HttpRequest({
    method: 'POST',
    protocol: url.protocol,
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      host: url.hostname,
      'content-type': 'application/json',
    },
    body: payload,
  });

  const signer = new SignatureV4({
    service: 'execute-api',
    region,
    credentials,
    sha256: Sha256,
  });
  const signed = await signer.sign(request);

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: signed.headers,
    body: payload,
  });
  return { status: res.status, body: await res.text() };
};

/**
 * Parse a JSON response body's `message` field, falling back to the raw body
 * when it is not JSON.
 * @param body The raw response body.
 * @returns The `message` field, or the raw body.
 */
export const parseResponseMessage = (body: string): string => {
  try {
    return (JSON.parse(body) as { message?: string }).message ?? body;
  } catch {
    return body;
  }
};
