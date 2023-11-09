/**
 * These are some utility types to make the namespace field a bit more self-documenting
 * The namespace in the BackendIdentifier can either be an AppId or a ProjectName
 * ProjectName is the value of package.json#name in the project's package.json file
 */
export type AppId = string;
export type ProjectName = string;

/**
 * These are some utility types to make the instance field a bit more self-documenting
 * The instance in the BackendIdentifier can either be a BranchName or a UserName
 */
export type BranchName = string;
export type UserName = string;

/**
 * This tuple defines the constituent parts that are used to construct backend stack names
 * The stack name becomes what identifies a deployed backend.
 *
 * To translate to/from a stack name, use the utility methods in @aws-amplify/platform-core
 */
export type BackendIdentifier =
  | {
      namespace: AppId;
      name: BranchName;
      type: 'branch';
    }
  | {
      namespace: ProjectName;
      name: UserName;
      type: 'sandbox';
    };
