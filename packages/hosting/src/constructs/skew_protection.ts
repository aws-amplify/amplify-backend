import { BUILD_ID_PATTERN } from '../defaults.js';
import { HostingError } from '../hosting_error.js';

/**
 * Configuration for cookie-based skew protection.
 *
 * When enabled, CloudFront Functions route returning users to the build
 * they originally started their session on (via a cookie), preventing
 * asset mismatches during rolling deployments.
 */
export type SkewProtectionConfig = {
  enabled: boolean;
  /**
   * How long (in seconds) old-build cookies remain valid.
   * After this period, the user is routed to the latest build.
   * @default 86400 (24 hours)
   */
  maxAge?: number;
};

/** Default cookie max-age in seconds (24 hours). */
const DEFAULT_MAX_AGE = 86400;

/** Cookie name used to pin a user session to a specific build. */
const COOKIE_NAME = '__dpl';

/**
 * Generates CloudFront Function code for the viewer-request event.
 *
 * This function:
 * 1. Reads the `__dpl` cookie from the incoming request
 * 2. If present and valid, rewrites the URI to that build's prefix
 * 3. If absent, uses the current (deploy-time) build ID
 * 4. Appends `index.html` for directory-style paths
 * @param buildId - The current build ID baked in at synth time
 * @returns CloudFront Function source code (JavaScript)
 */
export const generateSkewProtectionViewerRequestCode = (
  buildId: string,
): string => {
  validateBuildId(buildId);
  return `function handler(event) {
  var request = event.request;
  var uri = request.uri;
  var buildId = '${buildId}';
  var cookieHeader = request.headers.cookie ? request.headers.cookie.value : '';
  var match = cookieHeader.match(/(?:^|;\\s*)${COOKIE_NAME}=([a-zA-Z0-9-]{1,64})/);
  if (match) {
    buildId = match[1];
  }
  if (uri.endsWith('/')) {
    uri = uri + 'index.html';
  }
  request.uri = '/builds/' + buildId + uri;
  return request;
}`;
};

/**
 * Generates CloudFront Function code for the viewer-response event.
 *
 * This function:
 * 1. Inspects the Content-Type response header
 * 2. Only for HTML responses (text/html), sets the `__dpl` cookie
 *    to the current build ID — pinning the user's session to this build
 * 3. Non-HTML responses (JS, CSS, images) are passed through unchanged
 * @param buildId - The current build ID baked in at synth time
 * @param maxAge  - Cookie lifetime in seconds (default: 86400)
 * @returns CloudFront Function source code (JavaScript)
 */
export const generateSkewProtectionViewerResponseCode = (
  buildId: string,
  maxAge: number = DEFAULT_MAX_AGE,
): string => {
  validateBuildId(buildId);
  if (maxAge < 0 || maxAge > 2592000) {
    throw new HostingError('InvalidSkewProtectionMaxAgeError', {
      message: `maxAge must be between 0 and 2592000 (30 days). Got: ${maxAge}`,
      resolution: 'Provide a maxAge value between 0 and 2592000 seconds.',
    });
  }
  return `function handler(event) {
  var response = event.response;
  var contentType = response.headers['content-type'] ? response.headers['content-type'].value : '';
  if (contentType.indexOf('text/html') >= 0) {
    response.headers['set-cookie'] = { value: '${COOKIE_NAME}=${buildId}; Path=/; SameSite=Lax; Max-Age=${maxAge}' };
  }
  return response;
}`;
};

/** Validates a build ID string. */
const validateBuildId = (buildId: string): void => {
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new HostingError('InvalidBuildIdError', {
      message: `Build ID must be alphanumeric with hyphens, max 64 chars. Got: ${buildId}`,
      resolution:
        'Ensure build ID contains only letters, numbers, and hyphens.',
    });
  }
};
