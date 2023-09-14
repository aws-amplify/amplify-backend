/**
 * Supported auth trigger events. Derived from CDK UserPoolOperation, but we can't use that to get type inference
 * because the operation names are typed as "string" rather than a string literal
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
