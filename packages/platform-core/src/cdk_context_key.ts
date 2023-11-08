/**
 * Keys for values that are passed between the Amplify deployment engine and the CDK synth process via CDK Context
 */
export enum CDKContextKey {
  BACKEND_INSTANCE = 'amplify-backend-instance',
  BACKEND_NAMESPACE = 'amplify-backend-namespace',
  DEPLOYMENT_TYPE = 'amplify-backend-type',
}
