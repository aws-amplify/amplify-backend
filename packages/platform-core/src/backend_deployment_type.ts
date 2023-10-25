export enum BackendDeploymentType {
  SANDBOX = 'SANDBOX',
  BRANCH = 'BRANCH',
}

/**
 * Key that is used to fetch the deployment type. Used as a CDK context key for getting/setting the deployment type in the CDK synth engine
 */
export const backendDeploymentTypeKey = 'deployment-type';
