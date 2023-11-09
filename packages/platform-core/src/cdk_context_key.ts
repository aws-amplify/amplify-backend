/**
 * Keys for values that are passed between the Amplify deployment engine and the CDK synth process via CDK Context
 *
 * !!!WARNING!!!
 * Changing the values of these keys could be a breaking change
 */
export enum CDKContextKey {
  BACKEND_NAME = 'amplify-backend-name',
  BACKEND_NAMESPACE = 'amplify-backend-namespace',
  DEPLOYMENT_TYPE = 'amplify-backend-type',
}
