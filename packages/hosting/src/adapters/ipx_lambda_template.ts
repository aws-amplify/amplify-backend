/**
 * Source for the IPX Lambda handler the Nitro adapter materialises
 * into the user's project at `.amplify-hosting/image-optimization/index.mjs`
 * before the L3 deploy reads from it.
 *
 * Inlined as a string so the template ships inside the compiled
 * package (TypeScript only copies `.ts`/`.js`, not `.mjs`).
 *
 * Runtime contract:
 *   - The Lambda exposes `handler(event)` for AWS Lambda Function URL
 *     invocations.
 *   - Originals are fetched directly from S3 (the static-assets bucket
 *     the L3 provisioned) via the AWS SDK + Lambda execution role.
 *     We use a custom IPX storage adapter rather than ipxHttpStorage
 *     to avoid a circular CDK dependency on the CloudFront distribution.
 *
 * Env vars set by the L3 construct:
 *   - `BUCKET_NAME` — static-assets S3 bucket name (already injected
 *     by the L3 today for OpenNext compat).
 *   - `BUCKET_REGION` — bucket region.
 *   - `BUCKET_KEY_PREFIX` — `builds/<buildId>` prefix that namespaces
 *     this deploy's assets.
 *
 * SVG handling:
 *   IPX runs SVG inputs through SVGO (the upstream default; we don't
 *   override `svgo: false`). The output is a minified SVG, not a
 *   raster — sharp can't write SVG, so `?f=webp` etc. on an SVG
 *   source isn't meaningful. Users sometimes mistake "same visual,
 *   different bytes" for "no optimization" — it isn't, SVGO did its
 *   work. Upstream tracks broader format support in
 *   https://github.com/unjs/ipx/issues/261.
 */
export const IPX_LAMBDA_HANDLER_SOURCE = `import { createIPX, createIPXWebServer } from 'ipx';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Buffer } from 'node:buffer';

const bucket = process.env.BUCKET_NAME;
const region = process.env.BUCKET_REGION;
const keyPrefix = process.env.BUCKET_KEY_PREFIX || '';

if (!bucket || !region) {
  throw new Error(
    'BUCKET_NAME / BUCKET_REGION not set — image-optimization Lambda has no upstream to fetch originals from.',
  );
}

const s3 = new S3Client({ region });

/**
 * Custom IPX storage adapter that reads originals from S3 using the
 * Lambda execution role (no static keys, no inter-construct CDK
 * dependency on the CloudFront distribution).
 */
const resolveKey = (id) => {
  const cleanKey = id.replace(/^\\//, '');
  return keyPrefix ? \`\${keyPrefix}/\${cleanKey}\` : cleanKey;
};

const s3IpxStorage = {
  name: 'amplify-s3-storage',
  async getMeta(id) {
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: resolveKey(id) }),
      );
      // IPX wants { mtime, maxAge?, size? }; mtime and size are
      // enough for ETag generation.
      return {
        mtime: res.LastModified ? res.LastModified.getTime() : undefined,
        size: res.ContentLength,
      };
    } catch (err) {
      if (err?.name === 'NoSuchKey' || err?.name === 'NotFound') return undefined;
      throw err;
    }
  },
  async getData(id) {
    try {
      const res = await s3.send(
        new GetObjectCommand({ Bucket: bucket, Key: resolveKey(id) }),
      );
      return Buffer.from(await res.Body.transformToByteArray());
    } catch (err) {
      if (err?.name === 'NoSuchKey' || err?.name === 'NotFound') return undefined;
      throw err;
    }
  },
};

const ipx = createIPX({
  storage: s3IpxStorage,
});

const ipxServer = createIPXWebServer(ipx);

const log = (msg) =>
  process.stderr.write(\`[amplify-hosting:image] \${msg}\\n\`);

/**
 * Configurable base URL prefix the user wired into @nuxt/image. Defaults
 * to /_ipx, the @nuxt/image default. Users override via
 * \`runtimeConfig.ipx.baseURL\` in nuxt.config; the adapter forwards
 * that value into IPX_BASE_URL on this Lambda.
 */
const ipxBaseURL = (process.env.IPX_BASE_URL || '/_ipx').replace(/\\/+$/, '');
const ipxStripPattern = new RegExp(
  '^' + ipxBaseURL.replace(/[.*+?^\${}()|[\\]\\\\]/g, '\\\\$&'),
);

/**
 * Convert a Lambda Function URL event into a standard fetch Request.
 *
 * Strips the configured base URL prefix because IPX's web server
 * expects paths in the shape /<modifiers>/<sourcePath> (without the
 * prefix).
 */
const eventToRequest = (event) => {
  const rawPath = event.rawPath || '/';
  const stripped = rawPath.replace(ipxStripPattern, '') || '/';
  const query = event.rawQueryString ? \`?\${event.rawQueryString}\` : '';
  // The IPX server doesn't actually use the host part — it pulls path
  // and query from the URL. Use a placeholder.
  const url = new URL(stripped + query, 'http://image-opt.local');

  const method = event.requestContext?.http?.method || 'GET';
  const headers = new Headers();
  for (const [k, v] of Object.entries(event.headers || {})) {
    if (typeof v === 'string') headers.set(k, v);
  }

  const body = event.body
    ? Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
    : undefined;

  return new Request(url.toString(), { method, headers, body });
};

const responseToLambda = async (response) => {
  const arrayBuf = await response.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  const headers = {};
  for (const [k, v] of response.headers.entries()) headers[k] = v;
  return {
    statusCode: response.status,
    headers,
    body: buf.toString('base64'),
    isBase64Encoded: true,
  };
};

export const handler = async (event) => {
  try {
    const req = eventToRequest(event);
    const res = await ipxServer(req);
    return await responseToLambda(res);
  } catch (err) {
    log(\`error: \${err?.message ?? err}\`);
    return {
      statusCode: 500,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ error: 'image optimization failed' }),
    };
  }
};
`;

export const IPX_LAMBDA_PACKAGE_JSON = JSON.stringify(
  {
    name: 'amplify-hosting-image-optimization',
    version: '0.0.1',
    private: true,
    type: 'module',
    main: 'index.mjs',
    dependencies: {
      ipx: '^3.0.0',
      sharp: '^0.34.0',
    },
    // @aws-sdk/client-s3 is provided by the Lambda Node 20 runtime;
    // we don't bundle it (saves ~16 MB unzipped, keeps the bundle
    // under Lambda's 50 MB limit).
  },
  null,
  2,
);
