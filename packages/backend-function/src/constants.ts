/**
 * Name of environment variable that contains SSM parameter paths to resolve secrets during runtime
 */
export const amplifySsmEnvConfigKey = 'AMPLIFY_SSM_ENV_CONFIG';

/**
 * Placeholder text for environment variables whose value is a secret
 */
export const ssmValuePlaceholderText =
  '<value will be resolved during runtime>';
