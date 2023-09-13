/**
 * This array is exported for testing but is not exported from the package.
 * Only the type derived from the array should be used outside this package.
 *
 * We can't derive this type information from the CDK UserPoolOperation because those operation names are typed as "string" rather that string literals
 */

export const triggerEvents = [
  'createAuthChallenge',
  'customMessage',
  'defineAuthChallenge',
  'postAuthentication',
  'postConfirmation',
  'preAuthentication',
  'preSignUp',
  'preTokenGeneration',
  'userMigration',
  'verifyAuthChallengeResponse',
] as const;

/**
 * Union type of all supported auth trigger events
 */
export type TriggerEvent = (typeof triggerEvents)[number];
