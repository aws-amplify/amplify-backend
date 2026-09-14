/**
 * Interface for objects that can resolve a stack name
 */
export type MainStackNameResolver = {
  resolveMainStackName: () => Promise<string>;
};
