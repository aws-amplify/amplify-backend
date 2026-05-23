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
 * Build the standard security-headers behavior block. Extracted so the
 * per-pattern policies (used by manifest.headers[]) can include the same
 * security headers without duplicating the values.
 */
const buildSecurityHeadersBehavior = (props?: SecurityHeadersProps) => ({
  strictTransportSecurity: {
    accessControlMaxAge: Duration.days(730),
    includeSubdomains: true,
    preload: true,
    override: true,
  },
  contentTypeOptions: { override: true },
  frameOptions: {
    frameOption: HeadersFrameOption.SAMEORIGIN,
    override: true,
  },
  xssProtection: {
    protection: true,
    modeBlock: true,
    override: true,
  },
  referrerPolicy: {
    referrerPolicy: HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
    override: true,
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
    securityHeadersBehavior: buildSecurityHeadersBehavior(props),
    customHeadersBehavior: { customHeaders: items },
  });
};
