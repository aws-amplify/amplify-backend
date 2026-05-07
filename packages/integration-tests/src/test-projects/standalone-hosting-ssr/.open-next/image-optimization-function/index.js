// Image optimization Lambda handler for E2E testing.
// Returns a minimal WebP image with correct headers.

// 1x1 transparent WebP pixel (26 bytes)
const WEBP_1x1 = Buffer.from(
  'UklGRiYAAABXRUJQVlA4IBoAAAAwAQCdASoBAAEAAkA4JYgCdAEO/hepAA==',
  'base64',
);

exports.handler = async (event) => {
  const queryString = event.queryStringParameters || {};
  const url = queryString.url || '';
  const w = parseInt(queryString.w || '800', 10);
  const q = parseInt(queryString.q || '75', 10);

  return {
    statusCode: 200,
    headers: {
      'content-type': 'image/webp',
      'cache-control': 'public, max-age=31536000, immutable',
      'x-image-width': String(w),
      'x-image-quality': String(q),
      'x-original-url': url,
    },
    body: WEBP_1x1.toString('base64'),
    isBase64Encoded: true,
  };
};
