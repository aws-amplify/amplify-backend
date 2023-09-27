/**
 * Some string type aliases to make the code a bit more self documenting
 * A BackendId can either be an AppId or a SandboxId
 * In either case, it is just a string that is used to disambiguate stack names
 */
export type AppId = string;
export type SandboxId = string;
export type BackendId = AppId | SandboxId;

/**
 * Tuple of values that uniquely identifies a deployed backend.
 * Used to generate stack names for deployments
 */
export type UniqueBackendIdentifier = {
  backendId: BackendId;
  branchName: 'sandbox' | string;
};
