/**
 * Some string type aliases to make the code a bit more self documenting
 * A BackendId can either be an AppId or a SandboxId.
 * A SandboxId is the value of package.json#name in the project's package.json file
 */
export type AppId = string;
export type ProjectName = string;

/**
 * The disambiguator is either a branch name in the case of branch deployments or the sandbox name for sandbox deployments
 * By default the sandbox name is the username of the current local user
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
