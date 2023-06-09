/**
 * Class that uniquely identifies an Amplify environment
 */
export class ProjectEnvironmentIdentifier {
  /**
   * Construct an environment identifier from a project and environment name
   */
  constructor(
    private readonly projectName: string,
    private readonly environmentName: string
  ) {}
  /**
   * Convert to a parameter name that identifies this environment
   */
  toOutputStackSSMParameterName(): string {
    return `/amplify/${this.projectName}/${this.environmentName}/outputStackName`;
  }

  /**
   * Returns a string that can be used as a stack name for this environment
   *
   * This should NOT be assumed to be the actual stack name for the environment, simply a default that can be used
   */
  toDefaultStackName(): string {
    return `${this.projectName}-${this.environmentName}`;
  }
}
