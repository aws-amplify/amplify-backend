/**
 * returns the latest available payload version
 */
export const latestPayloadVersion = '1.0.0';

/**
 * Key to access whether user opted-in status of telemetry tracking preference.
 */
export const TELEMETRY_TRACKING_ENABLED = 'telemetry.enabled';

/**
 * List of dependencies to report versions to telemetry
 */
export const dependenciesToReport = [
  '@aws-amplify/ai-constructs',
  '@aws-amplify/auth-construct',
  '@aws-amplify/backend',
  '@aws-amplify/backend-ai',
  '@aws-amplify/backend-auth',
  '@aws-amplify/backend-cli',
  '@aws-amplify/backend-data',
  '@aws-amplify/backend-deployer',
  '@aws-amplify/backend-function',
  '@aws-amplify/backend-output-schemas',
  '@aws-amplify/backend-output-storage',
  '@aws-amplify/backend-secret',
  '@aws-amplify/backend-storage',
  '@aws-amplify/cli-core',
  '@aws-amplify/client-config',
  '@aws-amplify/deployed-backend-client',
  '@aws-amplify/form-generator',
  '@aws-amplify/model-generator',
  '@aws-amplify/platform-core',
  '@aws-amplify/plugin-types',
  '@aws-amplify/sandbox',
  '@aws-amplify/schema-generator',
  '@aws-amplify/seed',
  'aws-cdk',
  'aws-cdk-lib',
];
