import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'node:crypto';

// Round-trip echo for every HTTP verb. Used by deployment tests to prove the
// SSR origin (REST API + STREAM) accepts non-empty POST/PUT/PATCH bodies and
// preserves DELETE query params — regression coverage for the OAC + Function
// URL body-hash bug.

export const dynamic = 'force-dynamic';

const handler = (method: string) => async (req: NextRequest) => {
  const ct = req.headers.get('content-type') ?? null;
  let body: unknown = null;
  let bodyBytes = 0;
  let sha256: string | null = null;

  if (method !== 'GET' && method !== 'HEAD' && method !== 'DELETE') {
    if (ct?.startsWith('application/octet-stream')) {
      const buf = Buffer.from(await req.arrayBuffer());
      bodyBytes = buf.length;
      sha256 = createHash('sha256').update(buf).digest('hex');
    } else if (ct?.startsWith('application/json')) {
      try {
        body = await req.json();
      } catch {
        body = null;
      }
    } else {
      body = await req.text();
      bodyBytes = (body as string).length;
    }
  }

  return NextResponse.json({
    ok: true,
    method,
    contentType: ct,
    body,
    bodyBytes,
    sha256,
    query: Object.fromEntries(new URL(req.url).searchParams),
  });
};

export const GET = handler('GET');
export const POST = handler('POST');
export const PUT = handler('PUT');
export const PATCH = handler('PATCH');
export const DELETE = handler('DELETE');
