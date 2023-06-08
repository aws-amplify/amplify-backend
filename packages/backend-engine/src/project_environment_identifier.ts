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
   * Convert to a stack name that is unique to this environment
   */
  toStackName(): string {
    return `${this.projectName}-${this.environmentName}`;
  }
}
