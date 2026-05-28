/**
 * Pure helpers for `manifest.basePath` — the cross-framework URL prefix
 * that maps to Next.js `basePath`, Astro `base`, Nuxt `app.baseURL`.
 *
 * Both functions do plain string manipulation of glob-style patterns; no
 * URL parsing, no framework-specific knowledge. Adapter code calls
 * `normalizeBasePath` on the user's raw config value, then the L3 calls
 * `prependBasePath` on every emitted CloudFront behavior pattern.
 */

/**
 * Normalize a user-supplied base path.
 *
 * - `'/app/'` → `'/app'` (drop trailing slash)
 * - `'/'` → `undefined` (root is the default; don't carry a no-op prefix)
 * - `''` → `undefined`
 * - `undefined` → `undefined`
 * - `'app'` → `'/app'` (add leading slash)
 *
 * Returns `undefined` when the framework isn't using a base path, which
 * keeps the `manifest.basePath` field omitted in the common case.
 */
export const normalizeBasePath = (
  raw: string | undefined,
): string | undefined => {
  if (raw === undefined) return undefined;
  const trimmed = raw.trim();
  if (trimmed === '' || trimmed === '/') return undefined;
  const withLeading = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
};

/**
 * Prepend `basePath` to a URL pattern.
 *
 * Examples (basePath = `/app`):
 * - `('/foo/*')` → `'/app/foo/*'`
 * - `('/')` → `'/app/'`
 * - `('foo')` → `'/app/foo'`
 *
 * When `basePath` is `undefined`, the pattern is returned unchanged.
 */
export const prependBasePath = (
  basePath: string | undefined,
  pattern: string,
): string => {
  if (!basePath) return pattern;
  if (pattern === '' || pattern === '/') return `${basePath}/`;
  const withLeading = pattern.startsWith('/') ? pattern : `/${pattern}`;
  return `${basePath}${withLeading}`;
};
