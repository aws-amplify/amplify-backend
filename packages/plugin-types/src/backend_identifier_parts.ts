/**
 * These are some utility types to make the namespace field a bit more self-documenting
 * The namespace in the BackendIdentifierParts can either be an AppId or a ProjectName
 * ProjectName is the value of package.json#name in the project's package.json file
 */
export type AppId = string;
export type ProjectName = string;

/**
 * These are some utility types to make the instance field a bit more self-documenting
 * The instance in the BackendIdentifierParts can either be a BranchName or a UserName
 */
export type BranchName = string;
export type UserName = string;

export type BackendIdentifierParts =
  | {
      namespace: AppId;
      instance: BranchName;
      type: 'branch';
    }
  | {
      namespace: ProjectName;
      instance: UserName;
      type: 'sandbox';
    };
