import { Construct } from 'constructs';
import { Duration } from 'aws-cdk-lib';
import {
  HeadersFrameOption,
  HeadersReferrerPolicy,
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
    securityHeadersBehavior: {
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
    },
  });
};
