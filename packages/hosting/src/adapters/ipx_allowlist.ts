/**
 * Pure allowlist matchers for the IPX image-optimization Lambda.
 *
 * Lifted out of `ipx_lambda_template.ts` so they can be unit-tested in
 * isolation — without spinning up an IPX server or constructing a
 * Lambda Function URL event. The template embeds the **stringified
 * source** of these functions (see `IPX_LAMBDA_HANDLER_SOURCE` for the
 * concatenation point), so the runtime behavior is byte-for-byte the
 * same as what the Lambda executes.
 *
 * Why pull them out: the bug Josh flagged on PR #3220 (`startsWith`
 * matching `/images-secret/anything` for an `/images` allowlist) was a
 * one-line fix in a 90-line block of security-critical URL-parsing
 * code with zero tests. Tests that go through the deployed Lambda
 * are slow and require AWS; tests that go through the template
 * string require eval/vm. Direct exports trade a small amount of
 * duplication (the template still inlines the source for the runtime)
 * for a fast, readable test surface that catches edge cases like
 * userinfo-spoofed hostnames, path-segment boundaries, and
 * protocol-relative URLs at build time.
 *
 * Anything in this file MUST be self-contained — no imports beyond
 * built-ins — because the template embeds it verbatim into a Lambda
 * bundle that runs without a bundler.
 */

/**
 * Hostname matcher honoring Next.js `*.example.com` semantics.
 *
 * - Exact match: `host === pattern`.
 * - Wildcard prefix `*.example.com`: matches `foo.example.com` and
 *   `a.b.example.com`, but NOT `example.com` itself (the bare apex).
 *   This mirrors what Next.js does for `images.remotePatterns`.
 *
 * Returns `false` for empty / nullish patterns rather than matching
 * everything — keeps the default-deny invariant.
 */
export const matchHostname = (host: string, pattern: string): boolean => {
  if (!pattern) return false;
  if (pattern.startsWith('*.')) {
    return host.endsWith(pattern.slice(1)) && host !== pattern.slice(2);
  }
  return host === pattern;
};

/**
 * Path-prefix matcher anchored at a path-segment boundary.
 *
 * `pathname.startsWith('/images')` (a naive check) lets `/images-secret`
 * pass — the prefix matches but the URL crosses an intent boundary.
 * Anchor on either an exact match or a `/`-terminated prefix instead.
 *
 * Trailing `/` on the pattern is normalized away so callers can pass
 * either `/images` or `/images/`.
 */
export const matchPathPrefix = (pathname: string, ptn: string): boolean => {
  if (!ptn || ptn === '/') return true;
  const norm = ptn.endsWith('/') ? ptn.slice(0, -1) : ptn;
  return pathname === norm || pathname.startsWith(norm + '/');
};

/**
 * Pattern shape the runtime accepts for each entry in
 * `IMAGE_REMOTE_PATTERNS`. Mirrors Next.js `remotePatterns`.
 */
export type RemotePattern = {
  hostname: string;
  protocol?: 'http' | 'https';
  port?: string;
  /** Pattern matching the URL path. Trailing `/**` is treated as wildcard. */
  pathname?: string;
};

/**
 * Decide whether a remote `http(s)://` source URL is allowed.
 *
 * Default-deny behavior:
 *   - Non-`http`/`https` protocols rejected (no `file:`, `data:`, etc.).
 *   - URLs containing `username` or `password` (the userinfo
 *     component) are rejected outright. Those let attackers smuggle
 *     hosts past a naive hostname inspection — `https://allowed.com@evil.com`
 *     parses to `hostname === 'evil.com'` but the visible string
 *     suggests `allowed.com`, which is a misleading log entry at best.
 *   - Hostname must match either `allowedHostnames` (CSV bare hosts)
 *     or one of `parsedRemotePatterns` (full pattern entries).
 *   - When a pattern declares `pathname`, the URL's path must clear
 *     `matchPathPrefix` (segment-boundary anchored, NOT `startsWith`).
 *   - Protocol/port constraints on a matching pattern are enforced.
 *
 * Returns `false` for any malformed URL — a parse failure is treated
 * as untrusted input.
 */
export const isRemoteSourceAllowed = (
  rawSrc: string,
  parsedRemotePatterns: ReadonlyArray<RemotePattern>,
  allowedHostnames: ReadonlyArray<string>,
): boolean => {
  let parsed: URL;
  try {
    parsed = new URL(rawSrc);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }
  if (parsed.username || parsed.password) {
    return false;
  }
  const host = parsed.hostname;
  if (allowedHostnames.some((h) => matchHostname(host, h))) return true;
  for (const p of parsedRemotePatterns) {
    if (!matchHostname(host, p.hostname)) continue;
    if (p.protocol && p.protocol + ':' !== parsed.protocol) continue;
    if (p.port && p.port !== parsed.port) continue;
    if (p.pathname) {
      const ptn = p.pathname.endsWith('/**')
        ? p.pathname.slice(0, -3)
        : p.pathname;
      if (!matchPathPrefix(parsed.pathname, ptn)) continue;
    }
    return true;
  }
  return false;
};
