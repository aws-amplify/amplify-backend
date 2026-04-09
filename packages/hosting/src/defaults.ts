/**
 * Shared default values for the hosting package.
 */

import { randomUUID } from 'node:crypto';
import { HostingError } from './hosting_error.js';

/**
 * S3 object key for the SSR error page used in CloudFront 5xx error responses.
 */
export const ERROR_PAGE_KEY = '_error.html';

/**
 * Get the default build output directory for a given framework.
 */
export const getDefaultBuildOutputDir = (framework: string): string => {
  switch (framework) {
    case 'nextjs':
      return '.next';
    case 'spa':
      return 'dist';
    case 'static':
      return 'public';
    default:
      return 'dist';
  }
};

/**
 * Default port for SSR server processes (Lambda Web Adapter).
 */
export const SSR_DEFAULT_PORT = 3000;

/**
 * Build ID validation pattern: alphanumeric with hyphens, max 64 chars.
 */
export const BUILD_ID_PATTERN = /^[a-zA-Z0-9-]{1,64}$/;

/**
 * Generate CloudFront Function code that prepends the build ID prefix to request URIs.
 * This enables atomic deploys — all assets are stored under `builds/{buildId}/`.
 */
export const generateBuildIdFunctionCode = (buildId: string): string => {
  if (!BUILD_ID_PATTERN.test(buildId)) {
    throw new HostingError('InvalidBuildIdError', {
      message: `Build ID must be alphanumeric with hyphens, max 64 chars. Got: ${buildId}`,
      resolution:
        'Ensure build ID contains only letters, numbers, and hyphens.',
    });
  }
  return `function handler(event) {
  var request = event.request;
  var uri = request.uri;
  // Append index.html for directory-style paths (e.g. "/" or "/about/")
  if (uri.endsWith('/')) {
    uri = uri + 'index.html';
  }
  // Prepend build ID prefix for atomic deployment
  request.uri = '/builds/${buildId}' + uri;
  return request;
}`;
};

/**
 * Generate a unique Build ID based on the current timestamp.
 */
export const generateBuildId = (): string => {
  const timestamp = Date.now().toString(36);
  const unique = randomUUID().split('-')[0];
  return `${timestamp}-${unique}`;
};
