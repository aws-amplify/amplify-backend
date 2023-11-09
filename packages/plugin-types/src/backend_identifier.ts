import { DeploymentType } from './deployment_type';

/**
 * These are some utility types to make the BackendIdentifier a bit more self-documenting
 */
export type AppId = string;
export type ProjectName = string;
export type BranchName = string;
export type SandboxName = string;

/**
 * This tuple defines the constituent parts that are used to construct backend stack names
 * The stack name becomes what identifies a deployed backend.
 *
 * To translate to/from a stack name, use the utility methods in @aws-amplify/platform-core
 */
export type BackendIdentifier =
  | {
      /**
       * The Amplify AppId for the backend
       */
      namespace: Readonly<AppId>;
      /**
       * The Amplify branch name for the backend
       */
      name: Readonly<BranchName>;
      /**
       * Const that determines this BackendIdentifier is for a branch backend
       */
      type: Readonly<Extract<DeploymentType, 'branch'>>;
      /**
       * Optional hash for consistent stack naming in cases where namespace or name contain characters that can't be serialized into a stack name
       */
      hash?: Readonly<string>;
    }
  | {
      /**
       * The project name for the sandbox.
       *
       * While this type does not enforce any specific behavior, at the time of writing, this value defaults to package.json#name when running sandbox commands
       * Consult upstream code for exact usage.
       */
      namespace: Readonly<ProjectName>;
      /**
       * The name of this sandbox.
       *
       * While this type does not enforce any specific behavior, at the time of writing, this value defaults to the current local username and can be overridden with the --name argument to sandbox.
       * Consult upstream code for exact usage.
       */
      name: Readonly<SandboxName>;
      /**
       * Const that determines this BackendIdentifier is for a sandbox backend
       */
      type: Readonly<Extract<DeploymentType, 'sandbox'>>;
      /**
       * Optional hash for consistent stack naming in cases where namespace or name contain characters that can't be serialized into a stack name
       */
      hash?: Readonly<string>;
    };
