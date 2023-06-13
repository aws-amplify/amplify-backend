/**
 * Interface for objects that can resolve a stack name
 */
export type BackendStackResolver = {
  resolveStackName(): Promise<string>;
};
