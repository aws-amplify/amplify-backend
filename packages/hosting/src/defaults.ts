/**
 * Shared default values for the hosting package.
 */

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
