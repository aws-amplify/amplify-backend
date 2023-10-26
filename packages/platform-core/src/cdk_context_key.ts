/**
 * Keys for values that are passed between the Amplify deployment engine and the CDK synth process via CDK Context
 *
 * This enum does not currently capture all context keys. We can refactor incrementally as we need to use these keys in multiple places
 */
export enum CDKContextKey {
  DEPLOYMENT_TYPE = 'deployment-type',
}
