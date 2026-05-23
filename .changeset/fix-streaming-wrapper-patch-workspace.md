---
'@aws-amplify/hosting': patch
---

fix(hosting): apply streaming-wrapper patch to all `index.mjs` bundles, not just the top-level

The Next.js adapter's `patchStreamingWrapperForApiGateway` neuters OpenNext's
brotli/gzip/deflate compression so API Gateway STREAM-mode delivers responses
with consistent framing. Previously it only patched
`server-functions/default/index.mjs`. For workspace-nested packages, OpenNext
emits the real bundle at `server-functions/default/<workspace-path>/index.mjs`
and writes a 60-byte re-export stub at the top — the patch silently no-op'd,
the wrapper kept compressing, and browsers saw `ERR_HTTP2_PROTOCOL_ERROR` on
cold loads because the response advertised an uncompressed `Content-Length`
with a brotli-compressed body.

The patcher now walks `server-functions/default/` recursively and patches
every `index.mjs` containing the wrapper signature. Idempotent.
