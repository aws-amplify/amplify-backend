import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import {
  HeadersFrameOption,
  HeadersReferrerPolicy,
  ResponseCustomHeader,
  ResponseHeadersPolicy,
} from 'aws-cdk-lib/aws-cloudfront';

// ---- Public types ----

/**
 * Props for the security headers factory function.
 */
export type SecurityHeadersProps = {
  /** Custom Content-Security-Policy header value. If not set, a restrictive default is used. */
  contentSecurityPolicy?: string;
};

// ---- Factory function ----

/**
 * Default Content-Security-Policy value.
 * Allows 'unsafe-inline' for script/style (needed for Next.js inline scripts),
 * wss: for AppSync subscriptions, and data: for images/fonts.
 * Does NOT include 'unsafe-eval'.
 */
const DEFAULT_CSP =
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https: wss:; media-src 'self'; object-src 'none'; frame-ancestors 'self'";

/**
 * Set of header names whose values are baked into the L3's strongly-typed
 * `securityHeadersBehavior`. If the user sets one of these via `headers()`
 * we have to either drop the L3 default for that header, or relax it to
 * non-override so the user's `customHeader` value wins.
 *
 * Why both modes: CloudFront's typed `securityHeadersBehavior` slots emit
 * the well-known header names regardless of `customHeadersBehavior` — if
 * we leave HSTS at `override: true` AND emit a custom HSTS, the typed
 * one wins. Setting `override: false` on the typed slot lets the
 * customHeader pass through.
 */
type SecurityHeaderName =
  | 'strict-transport-security'
  | 'x-content-type-options'
  | 'x-frame-options'
  | 'x-xss-protection'
  | 'referrer-policy'
  | 'content-security-policy';

const SECURITY_HEADER_NAMES: SecurityHeaderName[] = [
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'x-xss-protection',
  'referrer-policy',
  'content-security-policy',
];

const isOverridden = (
  customHeaders: Record<string, string> | undefined,
  name: SecurityHeaderName,
): boolean => {
  if (!customHeaders) return false;
  // CloudFront customHeader names are case-insensitive but stored as-is.
  return Object.keys(customHeaders).some((k) => k.toLowerCase() === name);
};

/**
 * Build the standard security-headers behavior block. Extracted so the
 * per-pattern policies (used by manifest.headers[]) can include the same
 * security headers without duplicating the values.
 *
 * When `customHeaders` is provided and overlaps with one of the typed
 * security-header slots, that slot is set to `override: false` so the
 * customHeader value wins on the wire. This addresses the case where the
 * user's `next.config.js headers()` (or Nuxt `routeRules`) sets, say,
 * `x-frame-options: DENY` — we want their value to ship, not the L3
 * default of `SAMEORIGIN`.
 */
const buildSecurityHeadersBehavior = (
  props?: SecurityHeadersProps,
  customHeaders?: Record<string, string>,
) => ({
  strictTransportSecurity: {
    accessControlMaxAge: Duration.days(730),
    includeSubdomains: true,
    preload: true,
    override: !isOverridden(customHeaders, 'strict-transport-security'),
  },
  contentTypeOptions: {
    override: !isOverridden(customHeaders, 'x-content-type-options'),
  },
  frameOptions: {
    frameOption: HeadersFrameOption.SAMEORIGIN,
    override: !isOverridden(customHeaders, 'x-frame-options'),
  },
  xssProtection: {
    protection: true,
    modeBlock: true,
    override: !isOverridden(customHeaders, 'x-xss-protection'),
  },
  referrerPolicy: {
    referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
    override: !isOverridden(customHeaders, 'referrer-policy'),
  },
  contentSecurityPolicy: {
    contentSecurityPolicy: props?.contentSecurityPolicy ?? DEFAULT_CSP,
    override: false,
  },
});

/**
 * Create a CloudFront ResponseHeadersPolicy with security headers.
 *
 * Includes HSTS (2 years, preload), X-Content-Type-Options, X-Frame-Options,
 * XSS-Protection, Referrer-Policy, and a Content-Security-Policy.
 */
export const createSecurityHeadersPolicy = (
  scope: Construct,
  id: string,
  props?: SecurityHeadersProps,
): ResponseHeadersPolicy => {
  return new ResponseHeadersPolicy(scope, id, {
    securityHeadersBehavior: buildSecurityHeadersBehavior(props),
  });
};

/**
 * Create a per-pattern ResponseHeadersPolicy that bundles the security
 * headers with a set of custom headers (one entry per pattern in
 * `manifest.headers[]`).
 *
 * Why a separate policy per pattern: CloudFront associates exactly one
 * ResponseHeadersPolicy with each cache behavior. We can't selectively
 * add headers — each behavior needs its own combined policy.
 */
export const createCustomHeadersPolicy = (
  scope: Construct,
  id: string,
  customHeaders: Record<string, string>,
  props?: SecurityHeadersProps,
): ResponseHeadersPolicy => {
  const items: ResponseCustomHeader[] = Object.entries(customHeaders).map(
    ([header, value]) => ({
      header,
      value,
      // Override so the manifest's value wins over the origin's. Custom
      // headers are explicit user intent; surprising precedence rules
      // (origin-wins) would be very confusing.
      override: true,
    }),
  );
  return new ResponseHeadersPolicy(scope, id, {
    securityHeadersBehavior: buildSecurityHeadersBehavior(props, customHeaders),
    customHeadersBehavior: { customHeaders: items },
  });
};
export { SECURITY_HEADER_NAMES };
