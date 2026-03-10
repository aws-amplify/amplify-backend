/**
 * Represents the types of Amplify deployments
 *
 * Branch deployments are tied to specific git branches and are designed to be used in CI/CD
 * Sandbox deployments are local development environments
 * Standalone deployments are deployments without Amplify Hosting
 */
export type DeploymentType = 'branch' | 'sandbox' | 'standalone';
