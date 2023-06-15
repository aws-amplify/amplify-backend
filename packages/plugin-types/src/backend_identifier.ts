/**
 * Identifies a stack by its name
 */
export type StackIdentifier = {
  stackName: string;
};

/**
 * Tuple that uniquely identifies a backend environment
 */
export type ProjectEnvironmentIdentifier = {
  projectName: string;
  environmentName: string;
};

/**
 * Union type of the ways a backend can be identified
 */
export type BackendIdentifier = StackIdentifier | ProjectEnvironmentIdentifier;
